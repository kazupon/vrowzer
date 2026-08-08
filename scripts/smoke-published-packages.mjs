import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  loadReleasePackages,
  releaseDependencyFields,
  repositoryRoot,
  sortPublishPackages
} from './lib/release-packages.mjs'
import { isDirectExecution, parseReleaseTag, runCommand } from './lib/release-utils.mjs'

const retryAttempts = 12
const retryDelay = 10_000
const publishedSmokeRootNames = Object.freeze(['vrowzer', '@vrowzer/vite-plugin'])

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))
}

async function getRegistryVersion(packageInfo, version, commandRunner) {
  const result = await commandRunner(
    'npm',
    ['view', `${packageInfo.name}@${version}`, 'version', '--json'],
    { cwd: repositoryRoot, capture: true, allowFailure: true }
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

export async function waitForPublishedPackages({
  packages,
  version,
  attempts = retryAttempts,
  delayMilliseconds = retryDelay,
  commandRunner = runCommand,
  sleep = delay
}) {
  let missing = []

  for (let attempt = 1; attempt <= attempts; attempt++) {
    missing = []
    for (const packageInfo of packages) {
      const publishedVersion = await getRegistryVersion(packageInfo, version, commandRunner)
      if (publishedVersion !== version) {
        missing.push(packageInfo.name)
      }
    }

    if (missing.length === 0) {
      return
    }
    if (attempt < attempts) {
      console.log(`Waiting for npm registry (${attempt}/${attempts}): ${missing.join(', ')}`)
      await sleep(delayMilliseconds)
    }
  }

  throw new Error(`npm registry did not expose ${version} for: ${missing.join(', ')}`)
}

function packageManifestPath(projectDirectory, packageName) {
  return resolve(projectDirectory, 'node_modules', ...packageName.split('/'), 'package.json')
}

async function validateInstalledVersions(projectDirectory, packages, version) {
  const errors = []
  for (const packageInfo of packages) {
    try {
      const manifest = JSON.parse(
        await readFile(packageManifestPath(projectDirectory, packageInfo.name), 'utf8')
      )
      if (manifest.version !== version) {
        errors.push(`${packageInfo.name} resolved to ${manifest.version}, expected ${version}`)
      }
    } catch (error) {
      errors.push(
        `${packageInfo.name} was not installed: ${error instanceof Error ? error.message : error}`
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(`Installed package validation failed:\n- ${errors.join('\n- ')}`)
  }
}

export function partitionPublishedSmokePackages(packages) {
  const packagesByName = new Map(packages.map(packageInfo => [packageInfo.name, packageInfo]))
  const transitiveNames = new Set()
  const pending = [...publishedSmokeRootNames]

  while (pending.length > 0) {
    const name = pending.pop()
    if (transitiveNames.has(name)) {
      continue
    }

    const packageInfo = packagesByName.get(name)
    if (!packageInfo) {
      throw new Error(`Published smoke root is missing from release packages: ${name}`)
    }
    transitiveNames.add(name)

    for (const field of releaseDependencyFields) {
      for (const dependencyName of Object.keys(packageInfo.manifest[field] ?? {})) {
        if (packagesByName.has(dependencyName) && !transitiveNames.has(dependencyName)) {
          pending.push(dependencyName)
        }
      }
    }
  }

  return {
    roots: publishedSmokeRootNames.map(name => packagesByName.get(name)),
    transitive: packages.filter(packageInfo => transitiveNames.has(packageInfo.name)),
    standalone: packages.filter(packageInfo => !transitiveNames.has(packageInfo.name))
  }
}

async function installExactPackages(projectDirectory, installTargets, commandRunner) {
  await commandRunner(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', ...installTargets],
    { cwd: projectDirectory }
  )
}

async function runImportSmoke(projectDirectory, commandRunner) {
  const smokePath = resolve(projectDirectory, 'smoke.mjs')
  await writeFile(
    smokePath,
    [
      "await import('vrowzer')",
      "await import('@vrowzer/vite-plugin')",
      "await import('@vrowzer/vite-dev-server/module-runner')",
      "await import('@vrowzer/service-worker-server')",
      "await import('@vrowzer/oxlint-plugin-service-worker')",
      "console.log('Published package imports succeeded')",
      ''
    ].join('\n')
  )
  await commandRunner('node', [smokePath], { cwd: projectDirectory })
}

export async function smokeInstalledPackages({
  packages,
  version,
  tarballDirectory,
  commandRunner = runCommand
}) {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'vrowzer-published-smoke-'))

  try {
    await writeFile(
      resolve(projectDirectory, 'package.json'),
      `${JSON.stringify({ name: 'vrowzer-published-smoke', private: true, type: 'module' }, null, 2)}\n`
    )

    if (tarballDirectory) {
      const tarballs = (await readdir(tarballDirectory))
        .filter(file => file.endsWith('.tgz'))
        .map(file => resolve(tarballDirectory, file))
        .sort()
      if (tarballs.length !== packages.length) {
        throw new Error(
          `Expected ${packages.length} tarballs in ${tarballDirectory}, found ${tarballs.length}`
        )
      }
      await installExactPackages(projectDirectory, tarballs, commandRunner)
    } else {
      const { roots, transitive, standalone } = partitionPublishedSmokePackages(packages)
      await installExactPackages(
        projectDirectory,
        roots.map(packageInfo => `${packageInfo.name}@${version}`),
        commandRunner
      )
      await validateInstalledVersions(projectDirectory, transitive, version)

      if (standalone.length > 0) {
        await installExactPackages(
          projectDirectory,
          standalone.map(packageInfo => `${packageInfo.name}@${version}`),
          commandRunner
        )
      }
    }

    await validateInstalledVersions(projectDirectory, packages, version)
    await runImportSmoke(projectDirectory, commandRunner)
  } finally {
    await rm(projectDirectory, { recursive: true, force: true })
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      tag: { type: 'string', default: process.env.TAG },
      'tarball-directory': { type: 'string' }
    }
  })
  if (!values.tag) {
    throw new Error('Pass the release tag with --tag or TAG')
  }

  const version = parseReleaseTag(values.tag)
  const packages = sortPublishPackages(await loadReleasePackages())
  const tarballDirectory = values['tarball-directory']
    ? resolve(values['tarball-directory'])
    : undefined

  if (!tarballDirectory) {
    await waitForPublishedPackages({ packages, version })
  }
  await smokeInstalledPackages({ packages, version, tarballDirectory })
  console.log(`Published package smoke passed for ${values.tag}`)
}

if (isDirectExecution(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
