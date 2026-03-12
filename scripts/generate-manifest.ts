/**
 * Generate a vrowser-manifest.json from a target project's package.json.
 *
 * Reads dependencies, walks node_modules for source files (including transitive deps),
 * detects project source files, and outputs a JSON manifest conforming to
 * schema/vrowser-manifest.json.
 *
 * Usage:
 *   tsx scripts/generate-manifest.ts [package.json path] [options]
 *
 * Options:
 *   --output, -o    Output path (default: vrowser-manifest.json in project dir)
 *   --name          Manifest name (default: package.json name)
 *   --active-file   Default file to open in editor
 *   --target, -t    Package name(s) to include in nodeModules (can be specified multiple times)
 *                   When specified, only these packages (+ their transitive deps) are included.
 *                   When omitted, all dependencies are included.
 *   --project, -p   Directory to scan for source files (files field).
 *                   When omitted, uses the package.json directory.
 *                   Paths in the manifest are relative to this directory.
 *
 * Examples:
 *   tsx scripts/generate-manifest.ts                           # use ./package.json
 *   tsx scripts/generate-manifest.ts packages/my-app/package.json
 *   tsx scripts/generate-manifest.ts packages/my-app/package.json -o manifest.json
 */

import { readdir, realpath, stat, writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { rolldown } from 'rolldown'

type PackageJson = {
  name: string
  type?: string
  exports?: Record<string, any> | string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  files?: string[]
}

// --- Config ---

const INCLUDE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.ts',
  '.mts',
  '.d.ts',
  '.d.mts',
  '.d.cts',
  '.svelte',
  '.vue',
  '.jsx',
  '.tsx',
  '.css',
  '.html',
  '.svg',
  '.yaml',
  '.yml',
  '.wasm'
])

const EXCLUDE_DIRS = new Set([
  '.git',
  '.github',
  '.pnpm',
  '.vite',
  '.vrowser',
  '__tests__',
  '__mocks__',
  'node_modules', // within a package, skip nested node_modules
  'test',
  'tests',
  'benchmark',
  'benchmarks'
])

const EXCLUDE_FILE_PREFIXES = ['README', 'LICENSE', 'CHANGELOG', 'LICENCE']
const EXCLUDE_FILE_SUFFIXES = ['.map']
const EXCLUDE_FILE_NAMES = new Set(['manifest.json', 'vrowser-manifest.json', 'package.json'])
// Test file patterns: *.test.{js,mjs,cjs,ts,cts,mts}, *.spec.{js,mjs,cjs,ts,cts,mts}
const TEST_FILE_RE = /\.(test|spec)\.(js|mjs|cjs|ts|cts|mts)$/

const PROJECT_SOURCE_PATTERNS = ['index.html', 'src', 'public']
const ACTIVE_FILE_CANDIDATES = [
  'App.vue',
  'App.svelte',
  'App.tsx',
  'App.jsx',
  'main.ts',
  'main.js',
  'index.html'
]

// --- CLI args ---

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  let input: string | undefined
  let outputPath: string | undefined
  let manifestName: string | undefined
  let activeFile: string | undefined
  let projectPath: string | undefined
  const targets: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i]
    } else if (arg === '--name') {
      manifestName = args[++i]
    } else if (arg === '--active-file') {
      activeFile = args[++i]
    } else if (arg === '--target' || arg === '-t') {
      targets.push(args[++i]!)
    } else if (arg === '--project' || arg === '-p') {
      projectPath = args[++i]
    } else if (!arg.startsWith('-')) {
      input = arg
    }
  }

  return { input, outputPath, manifestName, activeFile, targets, projectPath }
}

// --- Helpers ---

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const EMPTY_PKG_JSON = Object.freeze({
  name: '',
  dependencies: {},
  devDependencies: {},
  files: []
} as PackageJson)

async function readPackageJson(dir: string): Promise<PackageJson> {
  const pkgPath = join(dir, 'package.json')
  if (!(await exists(pkgPath))) {
    return EMPTY_PKG_JSON
  }
  try {
    const { default: pkg } = (await import(pkgPath, { with: { type: 'json' } })) as {
      default: PackageJson
    }
    return pkg
  } catch {
    return EMPTY_PKG_JSON
  }
}

function shouldIncludeFile(filePath: string): boolean {
  const name = basename(filePath)

  // Dot files (e.g. .eslintrc.js, .vite)
  if (name.startsWith('.')) {
    return false
  }

  // Exact file name exclusions
  if (EXCLUDE_FILE_NAMES.has(name)) {
    return false
  }

  // Check excluded prefixes
  if (EXCLUDE_FILE_PREFIXES.some(p => name.startsWith(p))) {
    return false
  }

  // Check excluded suffixes
  if (EXCLUDE_FILE_SUFFIXES.some(s => name.endsWith(s))) {
    return false
  }

  // Test files (*.test.js, *.spec.ts, etc.)
  if (TEST_FILE_RE.test(name)) {
    return false
  }

  const ext = extname(name)
  return INCLUDE_EXTENSIONS.has(ext)
}

function shouldExcludeDir(dirName: string): boolean {
  return EXCLUDE_DIRS.has(dirName) || dirName.startsWith('.')
}

/**
 * Recursively walk a directory and collect files.
 * Follows symlinks but records logical paths.
 */
async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      try {
        const s = await stat(fullPath)
        if (s.isDirectory()) {
          if (!shouldExcludeDir(entry.name)) {
            await walkDir(fullPath, files)
          }
        } else if (s.isFile() && shouldIncludeFile(entry.name)) {
          files.push(fullPath)
        }
      } catch {
        // broken symlink, skip
      }
    } else if (entry.isFile() && shouldIncludeFile(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Walk a package directory, respecting its package.json "files" field if present.
 */
async function walkPackageFiles(pkgDir: string): Promise<string[]> {
  const pkg = await readPackageJson(pkgDir)
  const pkgFiles = pkg.files

  if (pkgFiles && pkgFiles.length > 0) {
    // Use the "files" field to determine which files are published
    // Always include package.json itself
    const result: string[] = [join(pkgDir, 'package.json')]

    for (const pattern of pkgFiles) {
      const target = join(pkgDir, pattern)
      if (!(await exists(target))) {
        continue
      }

      try {
        const s = await stat(target)
        if (s.isDirectory()) {
          await walkDir(target, result)
        } else if (s.isFile() && shouldIncludeFile(target)) {
          result.push(target)
        }
      } catch {
        // skip
      }
    }

    return result
  }

  // No "files" field — walk everything with extension filter
  // Always include package.json (excluded by shouldIncludeFile but needed for resolve)
  const result = [join(pkgDir, 'package.json')]
  await walkDir(pkgDir, result)
  return result
}

// --- Dependency collection ---

async function resolvePackageDir(dep: string, fromDir: string): Promise<string | null> {
  // Try from the given path first, then from the real path (for pnpm symlinks).
  // pnpm places transitive deps alongside the package in .pnpm/pkg@ver/node_modules/,
  // which is only reachable from the real (resolved symlink) path.
  const dirs = [fromDir]
  try {
    const real = await realpath(fromDir)
    if (real !== fromDir) {
      dirs.push(real)
    }
  } catch {
    // ignore
  }

  for (const dir of dirs) {
    let current = dir
    while (true) {
      const candidate = join(current, 'node_modules', dep)
      if (await exists(candidate)) {
        return candidate
      }

      const parent = dirname(current)
      if (parent === current) {
        break
      }
      current = parent
    }
  }
  return null
}

async function collectDependencies(
  pkgDir: string,
  visited: Set<string>,
  isRoot = false
): Promise<string[]> {
  const pkg = await readPackageJson(pkgDir)
  // Root project: include both dependencies and devDependencies
  // Transitive deps: only include dependencies
  const deps = isRoot
    ? [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]
    : Object.keys(pkg.dependencies || {})
  const result: string[] = []

  for (const dep of deps) {
    const depDir = await resolvePackageDir(dep, pkgDir)
    if (!depDir) {
      continue
    }

    if (visited.has(depDir)) {
      continue
    }
    visited.add(depDir)
    result.push(depDir)

    // Recurse into transitive dependencies
    const transitive = await collectDependencies(depDir, visited)
    result.push(...transitive)
  }

  return result
}

// --- Project source files ---

async function collectProjectFiles(projectDir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}

  for (const pattern of PROJECT_SOURCE_PATTERNS) {
    const target = join(projectDir, pattern)
    if (!(await exists(target))) {
      continue
    }

    try {
      const s = await stat(target)
      if (s.isDirectory()) {
        const walked = await walkDir(target)
        for (const filePath of walked) {
          const relPath = relative(projectDir, filePath).replace(/\\/g, '/')
          files['/' + relPath] = './' + relPath
        }
      } else if (s.isFile() && shouldIncludeFile(target)) {
        const relPath = relative(projectDir, target).replace(/\\/g, '/')
        files['/' + relPath] = './' + relPath
      }
    } catch {
      // skip
    }
  }

  // Also pick up root-level source files (*.ts, *.js, *.vue, etc.)
  try {
    const rootEntries = await readdir(projectDir, { withFileTypes: true })
    for (const entry of rootEntries) {
      if (entry.isFile() && shouldIncludeFile(entry.name)) {
        const virtualPath = '/' + entry.name
        if (!files[virtualPath]) {
          files[virtualPath] = './' + entry.name
        }
      }
    }
  } catch {
    // skip
  }

  return files
}

function detectActiveFile(files: Record<string, string>): string | undefined {
  for (const candidate of ACTIVE_FILE_CANDIDATES) {
    const rootPath = '/' + candidate
    const srcPath = '/src/' + candidate
    if (files[rootPath]) {
      return rootPath
    }
    if (files[srcPath]) {
      return srcPath
    }
  }
  const keys = Object.keys(files)
  return keys.length > 0 ? keys[0] : undefined
}

// --- CJS → ESM bundling ---

function isCjsPackage(pkg: PackageJson): boolean {
  return pkg.type !== 'module'
}

/**
 * Extract export entry points from package.json exports field.
 * Returns a map of subpath → resolved file path relative to package dir.
 * e.g. { ".": "./index.js", "./jsx-dev-runtime": "./jsx-dev-runtime.js" }
 */
function extractExportEntries(
  pkg: PackageJson,
  conditions: string[] = ['browser', 'import', 'default']
): Record<string, string> {
  const entries: Record<string, string> = {}
  const exportsField = pkg.exports

  if (!exportsField || typeof exportsField === 'string') {
    return entries
  }

  for (const [subpath, value] of Object.entries(exportsField)) {
    // Skip non-JS exports (types, etc.)
    if (subpath.endsWith('.json') || subpath.includes('*')) {
      continue
    }

    const resolved = resolveExportCondition(value, conditions)
    if (resolved && resolved.endsWith('.js')) {
      entries[subpath] = resolved
    }
  }

  return entries
}

function resolveExportCondition(value: unknown, conditions: string[]): string | null {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object' && value !== null) {
    for (const cond of conditions) {
      if (cond in value) {
        return resolveExportCondition((value as Record<string, unknown>)[cond], conditions)
      }
    }
  }
  return null
}

/**
 * Convert subpath export key to a flat entry name for rolldown.
 * "." → packageName (e.g. "react")
 * "./jsx-dev-runtime" → "react_jsx-dev-runtime"
 */
function subpathToEntryName(pkgName: string, subpath: string): string {
  if (subpath === '.') {
    return pkgName.replace(/\//g, '_').replace(/@/g, '')
  }
  const sub = subpath.slice(2).replace(/\//g, '_') // strip "./"
  return `${pkgName.replace(/\//g, '_').replace(/@/g, '')}_${sub}`
}

interface CjsBundleResult {
  /** Map of virtual FS path → real file path (relative to sourceDir) */
  nodeModulesEntries: Record<string, string>
}

/**
 * Bundle CJS packages into ESM using rolldown.
 * Output goes to `<nodeModulesRoot>/.vrowser-esm/` directory.
 * Returns nodeModules entries for the bundled files + modified package.json.
 */
async function bundleCjsPackages(
  cjsPackages: { pkgName: string; pkg: PackageJson }[],
  sourceDir: string,
  nodeModulesRoot: string
): Promise<CjsBundleResult> {
  const entryToSubpath: Record<string, { pkgName: string; subpath: string }> = {}

  // Collect all entry points across all CJS packages
  for (const { pkgName, pkg } of cjsPackages) {
    const exportEntries = extractExportEntries(pkg)
    for (const [subpath] of Object.entries(exportEntries)) {
      const entryName = subpathToEntryName(pkgName, subpath)
      entryToSubpath[entryName] = { pkgName, subpath }
    }
  }

  if (Object.keys(entryToSubpath).length === 0) {
    return { nodeModulesEntries: {} }
  }

  console.log(`  Bundling CJS → ESM: ${Object.keys(entryToSubpath).length} entry points`)

  const esmDir = resolve(nodeModulesRoot, '.vrowser-esm')
  await mkdir(esmDir, { recursive: true })

  // Generate ESM wrapper entries with explicit named exports.
  // CJS modules expose exports via module.exports, which rolldown wraps as default.
  // We detect named exports by require()-ing the CJS module in Node.js,
  // then generate `export { name1, name2, ... } from 'pkg'` wrappers.
  const wrapperPlugin = {
    name: 'cjs-esm-wrapper',
    resolveId(id: string) {
      if (id.startsWith('\0esm-wrapper:')) {
        return id
      }
    },
    load(id: string) {
      if (id.startsWith('\0esm-wrapper:')) {
        const specifier = id.slice('\0esm-wrapper:'.length)
        const wrapperCode = esmWrappers.get(specifier)
        if (wrapperCode) {
          return wrapperCode
        }
        return `export { default } from '${specifier}';`
      }
    }
  }

  // Detect named exports from CJS modules and generate ESM wrappers
  const { createRequire } = await import('node:module')
  const require = createRequire(join(nodeModulesRoot, '_'))
  const esmWrappers = new Map<string, string>()

  for (const [entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    const specifier = subpath === '.' ? pkgName : `${pkgName}/${subpath.slice(2)}`
    try {
      const mod = require(specifier)
      const namedExports = Object.keys(mod).filter(k => k !== 'default' && k !== '__esModule')
      if (namedExports.length > 0) {
        const lines = [
          `import __cjs_mod__ from '${specifier}';`,
          `export default __cjs_mod__;`,
          ...namedExports.map(name => `export const ${name} = __cjs_mod__.${name};`)
        ]
        esmWrappers.set(specifier, lines.join('\n'))
      } else {
        esmWrappers.set(specifier, `export { default } from '${specifier}';`)
      }
    } catch {
      esmWrappers.set(specifier, `export { default } from '${specifier}';`)
    }
  }

  // Use wrapper virtual entries instead of direct CJS file paths
  const wrapperEntries: Record<string, string> = {}
  for (const [entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    const specifier = subpath === '.' ? pkgName : `${pkgName}/${subpath.slice(2)}`
    wrapperEntries[entryName] = `\0esm-wrapper:${specifier}`
  }

  // Bundle all CJS entries together (shared chunks for common code)
  const bundle = await rolldown({
    input: wrapperEntries,
    resolve: {
      conditionNames: ['browser', 'import', 'default'],
      modules: [nodeModulesRoot, 'node_modules']
    },
    transform: {
      define: {
        'process.env.NODE_ENV': JSON.stringify('development')
      }
    },
    plugins: [wrapperPlugin]
  })

  const { output } = await bundle.write({
    format: 'esm',
    dir: esmDir,
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
    minify: false
  })
  await bundle.close()

  // Build nodeModules entries for manifest
  const nodeModulesEntries: Record<string, string> = {}

  // Add all output files to nodeModules under /node_modules/.vrowser-esm/
  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      const virtualPath = `/node_modules/.vrowser-esm/${chunk.fileName}`
      const relPath = relative(sourceDir, resolve(esmDir, chunk.fileName)).replace(/\\/g, '/')
      nodeModulesEntries[virtualPath] = './' + relPath
    }
  }

  // Generate modified package.json for each CJS package
  // exports point to ../.vrowser-esm/entryName.js (relative from /node_modules/pkgName/)
  const pkgExportsMap = new Map<string, Record<string, string>>()
  for (const [entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    if (!pkgExportsMap.has(pkgName)) {
      pkgExportsMap.set(pkgName, {})
    }
    pkgExportsMap.get(pkgName)![subpath] = `../.vrowser-esm/${entryName}.js`
  }

  for (const { pkgName, pkg } of cjsPackages) {
    const modifiedExports = pkgExportsMap.get(pkgName) || {}

    // Write modified package.json to .vrowser-esm/ dir
    const modifiedPkg = {
      name: pkg.name,
      type: 'module',
      exports: modifiedExports
    }
    const modifiedPkgPath = resolve(
      esmDir,
      `${pkgName.replace(/\//g, '_').replace(/@/g, '')}-package.json`
    )
    await writeFile(modifiedPkgPath, JSON.stringify(modifiedPkg, null, 2) + '\n')

    const virtualPkgJsonPath = `/node_modules/${pkgName}/package.json`
    const relPkgJsonPath = relative(sourceDir, modifiedPkgPath).replace(/\\/g, '/')
    nodeModulesEntries[virtualPkgJsonPath] = './' + relPkgJsonPath
  }

  return { nodeModulesEntries }
}

// --- Main ---

async function main() {
  const { input, outputPath, manifestName, activeFile, targets, projectPath } = parseArgs(
    process.argv
  )

  // Resolve package directory from input package.json path (for node_modules resolution)
  let pkgDir: string
  if (input) {
    const inputPath = resolve(input)
    try {
      const s = await stat(inputPath)
      pkgDir = s.isFile() ? dirname(inputPath) : inputPath
    } catch {
      console.error(`Error: "${input}" does not exist.`)
      process.exit(1)
    }
  } else {
    pkgDir = process.cwd()
  }

  // Resolve source directory (for files collection and path base)
  // --project overrides: scan this directory for source files instead of pkgDir
  const sourceDir = projectPath ? resolve(projectPath) : pkgDir

  // Read package.json
  const pkgPath = join(pkgDir, 'package.json')
  if (!(await exists(pkgPath))) {
    console.error(`Error: No package.json found at ${pkgPath}`)
    process.exit(1)
  }
  const { default: pkg } = (await import(pkgPath, { with: { type: 'json' } })) as {
    default: PackageJson
  }
  const name = manifestName || pkg.name
  if (!name) {
    console.error('Error: No "name" field in package.json. Use --name to specify.')
    process.exit(1)
  }

  console.log(`Generating manifest for: ${pkgDir}`)
  if (sourceDir !== pkgDir) {
    console.log(`  Source directory: ${sourceDir}`)
  }

  // 1. Collect project source files (from sourceDir)
  const projectFiles = await collectProjectFiles(sourceDir)
  console.log(`  Project files: ${Object.keys(projectFiles).length}`)

  // 2. Collect dependency packages (from pkgDir's node_modules)
  const visited = new Set<string>()
  let depDirs: string[]
  if (targets.length > 0) {
    // Only collect specified target packages and their transitive deps
    depDirs = []
    for (const target of targets) {
      const depDir = await resolvePackageDir(target, pkgDir)
      if (!depDir) {
        console.warn(`  Warning: target package "${target}" not found in node_modules`)
        continue
      }
      if (!visited.has(depDir)) {
        visited.add(depDir)
        depDirs.push(depDir)
        const transitive = await collectDependencies(depDir, visited)
        depDirs.push(...transitive)
      }
    }
    console.log(`  Target packages: ${targets.join(', ')}`)
  } else {
    depDirs = await collectDependencies(pkgDir, visited, true)
  }
  console.log(`  Dependencies: ${depDirs.length} packages`)

  // 3. Separate CJS and ESM packages, walk ESM packages for individual files
  const cjsPackages: { pkgName: string; pkg: PackageJson }[] = []
  const nodeModulesFiles: Record<string, string> = {}

  for (const depDir of depDirs) {
    const depPkg = await readPackageJson(depDir)
    const pkgName = depPkg.name
    if (!pkgName) {
      continue
    }

    if (isCjsPackage(depPkg) && depPkg.exports) {
      // CJS package — will be bundled into ESM
      cjsPackages.push({ pkgName, pkg: depPkg })
    } else {
      // ESM package — collect individual files
      const files = await walkPackageFiles(depDir)
      for (const filePath of files) {
        const fileRelToPkg = relative(depDir, filePath).replace(/\\/g, '/')
        const virtualPath = `/node_modules/${pkgName}/${fileRelToPkg}`
        const relPath = relative(sourceDir, filePath).replace(/\\/g, '/')
        nodeModulesFiles[virtualPath] = './' + relPath
      }
    }
  }

  // 4. Bundle CJS packages into ESM
  if (cjsPackages.length > 0) {
    console.log(`  CJS packages: ${cjsPackages.map(p => p.pkgName).join(', ')}`)
    const nodeModulesRoot = join(pkgDir, 'node_modules')
    const { nodeModulesEntries } = await bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)
    Object.assign(nodeModulesFiles, nodeModulesEntries)
  }

  console.log(`  Node modules files: ${Object.keys(nodeModulesFiles).length}`)

  // 5. Build manifest
  const manifest: Record<string, any> = { name, files: projectFiles }

  if (Object.keys(nodeModulesFiles).length > 0) {
    manifest.nodeModules = nodeModulesFiles
  }

  const resolvedActiveFile = activeFile || detectActiveFile(projectFiles)
  if (resolvedActiveFile) {
    manifest.activeFile = resolvedActiveFile
  }

  // 6. Write output
  // -o path is resolved from cwd (not sourceDir), defaulting to vrowser-manifest.json in sourceDir
  const output = outputPath ? resolve(outputPath) : resolve(sourceDir, 'vrowser-manifest.json')
  await writeFile(output, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nDone: ${relative(process.cwd(), output)}`)
}

await main()
