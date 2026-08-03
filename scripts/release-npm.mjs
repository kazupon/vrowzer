import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { init as initModuleLexer, parse as parseModule } from 'es-module-lexer'
import { extract } from 'tar'
import { checkReleaseVersion } from './check-release-version.mjs'
import {
  loadReleasePackages,
  releaseDependencyFields,
  repositoryRoot,
  sortPublishPackages
} from './lib/release-packages.mjs'
import {
  getDistTag,
  getPackageNameFromSpecifier,
  isDirectExecution,
  parseReleaseTag,
  readJson,
  runCommand
} from './lib/release-utils.mjs'

export const viteDevServerRequiredFiles = Object.freeze([
  'client.d.ts',
  'dist/client/client.mjs',
  'dist/client/env.mjs',
  'dist/node/module-runner.js',
  'dist/node/rolldown-binding.wasm32-wasi.wasm',
  'dist/node/rolldown-worker.js',
  'dist/node/service-worker.d.ts',
  'dist/node/service-worker.js',
  'dist/node/transformer-chunks/rolldown-binding.wasm32-wasi.wasm',
  'dist/node/transformer-chunks/rolldown-worker.js',
  'dist/node/transformer.d.ts',
  'dist/node/transformer.js',
  'dist/node/web-worker.d.ts',
  'dist/node/web-worker.js',
  'dist/shared/messages.d.ts',
  'dist/shared/messages.js',
  'misc/false.js',
  'misc/true.js',
  'types/hot.d.ts'
])

function toPosixPath(path) {
  return path.split(sep).join('/')
}

async function listPackageFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    const metadata = await lstat(path)
    if (metadata.isSymbolicLink()) {
      throw new Error(`Packed package contains symbolic link ${toPosixPath(relative(root, path))}`)
    }
    if (metadata.isDirectory()) {
      files.push(...(await listPackageFiles(root, path)))
    } else if (metadata.isFile()) {
      files.push(toPosixPath(relative(root, path)))
    }
  }

  return files.sort()
}

function collectManifestTargets(value, targets) {
  if (typeof value === 'string') {
    if (value.startsWith('./')) {
      targets.add(value.slice(2).split(/[?#]/, 1)[0])
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectManifestTargets(item, targets)
    }
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectManifestTargets(item, targets)
    }
  }
}

function targetMatchesFiles(target, files) {
  if (!target.includes('*')) {
    return files.has(target)
  }

  const pattern = target
    .split('*')
    .map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const expression = new RegExp(`^${pattern}$`)
  return [...files].some(file => expression.test(file))
}

export async function collectModuleSpecifiers(source) {
  await initModuleLexer
  const [imports] = parseModule(source)
  const specifiers = new Set()
  for (const imported of imports) {
    if (typeof imported.n === 'string') {
      specifiers.add(imported.n)
    }
  }
  return specifiers
}

function resolvePackageImport(specifier, imports) {
  if (typeof imports?.[specifier] === 'string') {
    return imports[specifier]
  }

  for (const [key, value] of Object.entries(imports ?? {})) {
    if (!key.includes('*') || typeof value !== 'string') {
      continue
    }
    const [prefix, suffix] = key.split('*')
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
      continue
    }
    const replacement = specifier.slice(prefix.length, specifier.length - suffix.length)
    return value.replace('*', replacement)
  }

  return null
}

function validateSensitiveFiles(files, errors) {
  for (const file of files) {
    const segments = file.toLowerCase().split('/')
    const basename = segments.at(-1)
    if (
      segments.includes('.git') ||
      basename === '.npmrc' ||
      basename?.startsWith('.env') ||
      /\.(?:key|pem|p12|pfx)$/.test(basename ?? '')
    ) {
      errors.push(`packed package contains sensitive file ${file}`)
    }
  }
}

async function validateModuleDependencies(packageRoot, files, manifest, errors) {
  const declaredDependencies = new Set(
    releaseDependencyFields.flatMap(field => Object.keys(manifest[field] ?? {}))
  )
  const unresolved = new Map()

  for (const file of files) {
    if (!/\.[cm]?[jt]sx?$/.test(file) || file.endsWith('.map')) {
      continue
    }

    const source = await readFile(resolve(packageRoot, file), 'utf8')
    for (const specifier of await collectModuleSpecifiers(source)) {
      if (specifier.startsWith('#')) {
        const target = resolvePackageImport(specifier, manifest.imports)
        if (!target) {
          errors.push(`${file} imports ${specifier}, but package.json#imports does not resolve it`)
        } else if (target.startsWith('./')) {
          const normalizedTarget = target.slice(2).split(/[?#]/, 1)[0]
          if (!targetMatchesFiles(normalizedTarget, files)) {
            errors.push(`${file} imports ${specifier}, but packed target ${target} is missing`)
          }
        }
        continue
      }

      const dependencyName = getPackageNameFromSpecifier(specifier)
      if (
        dependencyName &&
        specifier !== '@vite/env' &&
        dependencyName !== manifest.name &&
        !declaredDependencies.has(dependencyName)
      ) {
        const importers = unresolved.get(dependencyName) ?? []
        importers.push(file)
        unresolved.set(dependencyName, importers)
      }
    }
  }

  for (const [dependencyName, importers] of unresolved) {
    errors.push(
      `${dependencyName} is imported by ${manifest.name} but is not a runtime/optional/peer dependency (${[...new Set(importers)].join(', ')})`
    )
  }
}

export async function validatePackedPackage({ packageInfo, tarball, version, internalNames }) {
  const extractionDirectory = await mkdtemp(join(tmpdir(), 'vrowzer-packed-package-'))

  try {
    await extract({ file: tarball, cwd: extractionDirectory, strict: true })
    const packageRoot = resolve(extractionDirectory, 'package')
    const manifest = await readJson(resolve(packageRoot, 'package.json'))
    const fileList = await listPackageFiles(packageRoot)
    const files = new Set(fileList)
    const errors = []

    if (manifest.name !== packageInfo.name) {
      errors.push(`packed name is ${manifest.name}, expected ${packageInfo.name}`)
    }
    if (manifest.version !== version) {
      errors.push(`packed version is ${manifest.version}, expected ${version}`)
    }
    if (manifest.private === true) {
      errors.push('packed manifest must not be private')
    }
    if (manifest.publishConfig?.access !== 'public') {
      errors.push('packed manifest must set publishConfig.access to public')
    }

    for (const field of releaseDependencyFields) {
      for (const [dependencyName, specifier] of Object.entries(manifest[field] ?? {})) {
        if (specifier.startsWith('workspace:') || specifier.startsWith('catalog:')) {
          errors.push(`${field}.${dependencyName} retains source specifier ${specifier}`)
        }
        if (internalNames.has(dependencyName) && specifier !== version) {
          errors.push(`${field}.${dependencyName} is ${specifier}, expected exact ${version}`)
        }
      }
    }

    const targets = new Set()
    collectManifestTargets(manifest.exports, targets)
    collectManifestTargets(manifest.types, targets)
    collectManifestTargets(manifest.main, targets)
    collectManifestTargets(manifest.module, targets)
    collectManifestTargets(manifest.bin, targets)
    collectManifestTargets(manifest.typesVersions, targets)
    for (const target of targets) {
      if (!targetMatchesFiles(target, files)) {
        errors.push(`packed manifest target is missing: ./${target}`)
      }
    }

    validateSensitiveFiles(files, errors)
    await validateModuleDependencies(packageRoot, files, manifest, errors)

    if (packageInfo.name === '@vrowzer/vite-dev-server') {
      for (const requiredFile of viteDevServerRequiredFiles) {
        if (!files.has(requiredFile)) {
          errors.push(`required Vite artifact is missing: ${requiredFile}`)
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`${packageInfo.name} tarball validation failed:\n- ${errors.join('\n- ')}`)
    }

    const bytes = await readFile(tarball)
    return {
      packageInfo,
      tarball,
      manifest,
      files: fileList,
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      size: bytes.byteLength
    }
  } finally {
    await rm(extractionDirectory, { recursive: true, force: true })
  }
}

export async function packReleasePackages({
  packages,
  destination,
  root = repositoryRoot,
  commandRunner = runCommand
}) {
  await mkdir(destination, { recursive: true })
  const initialFiles = await readdir(destination)
  if (initialFiles.length > 0) {
    throw new Error(`Pack destination must be empty: ${destination}`)
  }

  const tarballs = new Map()
  for (const packageInfo of packages) {
    console.log(`Packing ${packageInfo.name}...`)
    const before = new Set(await readdir(destination))
    await commandRunner(
      'vp',
      ['pm', 'pack', '--filter', packageInfo.name, '--pack-destination', destination],
      { cwd: root, capture: true }
    )
    const created = (await readdir(destination)).filter(
      file => file.endsWith('.tgz') && !before.has(file)
    )
    if (created.length !== 1) {
      throw new Error(
        `${packageInfo.name} pack created ${created.length} tarballs, expected exactly one`
      )
    }
    tarballs.set(packageInfo.name, resolve(destination, created[0]))
  }

  return tarballs
}

export async function validateReleaseTarballs({ packages, tarballs, version }) {
  const internalNames = new Set(packages.map(packageInfo => packageInfo.name))
  const validated = []
  const errors = []

  for (const packageInfo of packages) {
    try {
      validated.push(
        await validatePackedPackage({
          packageInfo,
          tarball: tarballs.get(packageInfo.name),
          version,
          internalNames
        })
      )
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
  return validated
}

export function getPublishArguments({ tarball, distTag, dryRun = false }) {
  const args = ['publish', tarball, '--access', 'public', '--tag', distTag]
  if (dryRun) {
    args.push('--dry-run', '--force')
  }
  return args
}

async function getPublishedPackage(packageInfo, version, commandRunner, root) {
  const result = await commandRunner(
    'npm',
    ['view', `${packageInfo.name}@${version}`, 'version', 'dist.integrity', '--json'],
    { cwd: root, capture: true, allowFailure: true }
  )

  if (result.code === 0) {
    return JSON.parse(result.stdout)
  }
  if (result.stderr.includes('E404')) {
    return null
  }
  throw new Error(
    `Failed to query ${packageInfo.name}@${version}: ${result.stderr || result.stdout}`
  )
}

export async function publishReleasePackages({
  packages,
  version,
  distTag,
  root = repositoryRoot,
  commandRunner = runCommand
}) {
  const published = []
  const skipped = []

  for (const packedPackage of packages) {
    const existing = await getPublishedPackage(
      packedPackage.packageInfo,
      version,
      commandRunner,
      root
    )
    if (existing) {
      if (existing.version !== version || existing['dist.integrity'] !== packedPackage.integrity) {
        throw new Error(
          `${packedPackage.packageInfo.name}@${version} already exists with different integrity`
        )
      }
      skipped.push(packedPackage.packageInfo.name)
      continue
    }

    await commandRunner('npm', getPublishArguments({ tarball: packedPackage.tarball, distTag }), {
      cwd: root
    })
    published.push(packedPackage.packageInfo.name)
  }

  return { published, skipped }
}

export async function runPackageRelease({
  packages,
  destination,
  version,
  mode = 'publish',
  root = repositoryRoot,
  commandRunner = runCommand
}) {
  const tarballs = await packReleasePackages({
    packages,
    destination,
    root,
    commandRunner
  })
  const validated = await validateReleaseTarballs({
    packages,
    tarballs,
    version
  })

  for (const packageInfo of validated) {
    console.log(`Validated ${packageInfo.packageInfo.name}@${version} (${packageInfo.size} bytes)`)
  }

  if (mode === 'pack-only') {
    return { validated, published: [], skipped: [] }
  }

  const distTag = getDistTag(version)
  if (mode === 'dry-run') {
    for (const packageInfo of validated) {
      await commandRunner(
        'npm',
        getPublishArguments({
          tarball: packageInfo.tarball,
          distTag,
          dryRun: true
        }),
        { cwd: root }
      )
    }
    return { validated, published: [], skipped: [] }
  }

  if (mode !== 'publish') {
    throw new Error(`Unknown package release mode: ${mode}`)
  }

  const result = await publishReleasePackages({
    packages: validated,
    version,
    distTag,
    root,
    commandRunner
  })
  return { validated, ...result }
}

async function main() {
  const { values } = parseArgs({
    options: {
      tag: { type: 'string', default: process.env.TAG },
      'pack-only': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'pack-destination': { type: 'string' }
    }
  })

  if (!values['pack-only'] && !values['dry-run'] && !values.tag) {
    throw new Error('Publishing requires --tag or TAG')
  }

  let version
  let allPackages
  let publishOrder
  if (values.tag && !values['pack-only'] && !values['dry-run']) {
    const checked = await checkReleaseVersion({ tag: values.tag })
    version = checked.version
    allPackages = checked.packages
    publishOrder = checked.publishOrder
  } else {
    allPackages = await loadReleasePackages()
    const versions = new Set(allPackages.map(packageInfo => packageInfo.manifest.version))
    if (versions.size !== 1) {
      throw new Error(`Package versions are not in lockstep: ${[...versions].join(', ')}`)
    }
    version = [...versions][0]
    if (values.tag && parseReleaseTag(values.tag) !== version) {
      throw new Error(`Tag ${values.tag} does not match package version ${version}`)
    }
    await checkReleaseVersion({
      tag: `v${version}`,
      checkGit: false,
      changelog: `# v${version}`
    })
    publishOrder = sortPublishPackages(allPackages)
  }

  const createdTemporaryDestination = !values['pack-destination']
  const destination = values['pack-destination']
    ? resolve(values['pack-destination'])
    : await mkdtemp(join(tmpdir(), 'vrowzer-release-'))

  try {
    const mode = values['pack-only'] ? 'pack-only' : values['dry-run'] ? 'dry-run' : 'publish'
    const result = await runPackageRelease({
      packages: publishOrder,
      destination,
      version,
      mode
    })

    if (values['pack-only']) {
      console.log(`Tarballs: ${destination}`)
      return
    }

    if (values['dry-run']) {
      return
    }

    console.log(`Published: ${result.published.join(', ') || '(none)'}`)
    console.log(`Skipped: ${result.skipped.join(', ') || '(none)'}`)
  } finally {
    if (createdTemporaryDestination && !values['pack-only']) {
      await rm(destination, { recursive: true, force: true })
    }
  }
}

if (isDirectExecution(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
