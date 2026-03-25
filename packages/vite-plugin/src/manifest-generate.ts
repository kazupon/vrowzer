/**
 * Core logic for generating vrowzer-manifest.json.
 *
 * Shared between `scripts/generate-manifest.ts` (CLI) and
 * the `Vrowzer()` plugin (auto-generation mode).
 *
 * @module manifest-generate
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readdir, realpath, stat, writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { rolldown } from 'rolldown'

// --- Types ---

export type PackageJson = {
  name: string
  type?: string
  exports?: Record<string, any> | string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  files?: string[]
}

export interface GenerateManifestOptions {
  /**
   * Directory containing the target package.json (for node_modules resolution)
   */
  pkgDir: string
  /**
   * Directory to scan for project source files. Defaults to pkgDir.
   */
  sourceDir?: string
  /**
   * Package name(s) to include in nodeModules. When omitted, all dependencies are included.
   */
  targets?: string[]
  /**
   * When true, include devDependencies in dependency collection (default: false).
   * Used by CLI for fixture projects where runtime deps may be in devDependencies.
   */
  includeDevDependencies?: boolean
  /**
   * Override manifest name. Defaults to package.json name.
   */
  name?: string
  /**
   * Default file to open in editor
   */
  activeFile?: string
}

export interface ManifestResult {
  name: string
  files: Record<string, string>
  nodeModules?: Record<string, string>
  activeFile?: string
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
  '.vrowzer',
  '__tests__',
  '__mocks__',
  'node_modules',
  'test',
  'tests',
  'benchmark',
  'benchmarks'
])

const EXCLUDE_FILE_PREFIXES = ['README', 'LICENSE', 'CHANGELOG', 'LICENCE']
const EXCLUDE_FILE_SUFFIXES = ['.map']
const EXCLUDE_FILE_NAMES = new Set(['manifest.json', 'vrowzer-manifest.json', 'package.json'])
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

export async function readPackageJson(dir: string): Promise<PackageJson> {
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

export function shouldIncludeFile(filePath: string): boolean {
  const name = basename(filePath)

  if (name.startsWith('.')) {
    return false
  }

  if (EXCLUDE_FILE_NAMES.has(name)) {
    return false
  }

  if (EXCLUDE_FILE_PREFIXES.some(p => name.startsWith(p))) {
    return false
  }

  if (EXCLUDE_FILE_SUFFIXES.some(s => name.endsWith(s))) {
    return false
  }

  if (TEST_FILE_RE.test(name)) {
    return false
  }

  const ext = extname(name)
  return INCLUDE_EXTENSIONS.has(ext)
}

export function shouldExcludeDir(dirName: string): boolean {
  return EXCLUDE_DIRS.has(dirName) || dirName.startsWith('.')
}

/**
 * Recursively walk a directory and collect files.
 * Follows symlinks but records logical paths.
 */
export async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as unknown as import('node:fs').Dirent[]
  } catch {
    return files
  }

  for (const entry of entries) {
    const name = String(entry.name)
    const fullPath = join(dir, name)

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      try {
        const s = await stat(fullPath)
        if (s.isDirectory()) {
          if (!shouldExcludeDir(name)) {
            await walkDir(fullPath, files)
          }
        } else if (s.isFile() && shouldIncludeFile(name)) {
          files.push(fullPath)
        }
      } catch {
        // broken symlink, skip
      }
    } else if (entry.isFile() && shouldIncludeFile(name)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Walk a package directory, respecting its package.json "files" field if present.
 */
export async function walkPackageFiles(pkgDir: string): Promise<string[]> {
  const pkg = await readPackageJson(pkgDir)
  const pkgFiles = pkg.files

  if (pkgFiles && pkgFiles.length > 0) {
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
  const result = [join(pkgDir, 'package.json')]
  await walkDir(pkgDir, result)
  return result
}

// --- Dependency collection ---

export async function resolvePackageDir(dep: string, fromDir: string): Promise<string | null> {
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

export async function collectDependencies(
  pkgDir: string,
  visited: Set<string>,
  isRoot = false
): Promise<string[]> {
  const pkg = await readPackageJson(pkgDir)
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

    const transitive = await collectDependencies(depDir, visited)
    result.push(...transitive)
  }

  return result
}

// --- Project source files ---

export async function collectProjectFiles(projectDir: string): Promise<Record<string, string>> {
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
    const rootEntries = (await readdir(projectDir, {
      withFileTypes: true
    })) as unknown as import('node:fs').Dirent[]
    for (const entry of rootEntries) {
      const entryName = String(entry.name)
      if (entry.isFile() && shouldIncludeFile(entryName)) {
        const virtualPath = '/' + entryName
        if (!files[virtualPath]) {
          files[virtualPath] = './' + entryName
        }
      }
    }
  } catch {
    // skip
  }

  return files
}

export function detectActiveFile(files: Record<string, string>): string | undefined {
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

export function isCjsPackage(pkg: PackageJson): boolean {
  if (pkg.type === 'module') {
    return false
  }

  // Packages with ESM entries in exports (e.g. vue) are not truly CJS —
  // they provide ESM via the "import" condition and can be used directly.
  const mainExport =
    typeof pkg.exports === 'object' && pkg.exports !== null
      ? (pkg.exports as Record<string, any>)['.']
      : undefined
  if (mainExport && typeof mainExport === 'object' && 'import' in mainExport) {
    return false
  }

  return true
}

export function extractExportEntries(
  pkg: PackageJson,
  conditions: string[] = ['browser', 'import', 'default']
): Record<string, string> {
  const entries: Record<string, string> = {}
  const exportsField = pkg.exports

  if (!exportsField || typeof exportsField === 'string') {
    return entries
  }

  for (const [subpath, value] of Object.entries(exportsField)) {
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

export function subpathToEntryName(pkgName: string, subpath: string): string {
  if (subpath === '.') {
    return pkgName.replace(/\//g, '_').replace(/@/g, '')
  }
  const sub = subpath.slice(2).replace(/\//g, '_')
  return `${pkgName.replace(/\//g, '_').replace(/@/g, '')}_${sub}`
}

interface CjsBundleResult {
  nodeModulesEntries: Record<string, string>
}

export async function bundleCjsPackages(
  cjsPackages: { pkgName: string; pkg: PackageJson }[],
  sourceDir: string,
  nodeModulesRoot: string
): Promise<CjsBundleResult> {
  const entryToSubpath: Record<string, { pkgName: string; subpath: string }> = {}

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

  const esmDir = resolve(nodeModulesRoot, '.vrowzer-esm')
  await mkdir(esmDir, { recursive: true })

  // Generate ESM wrapper entries with explicit named exports
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

  const { createRequire } = await import('node:module')
  const require = createRequire(join(nodeModulesRoot, '_'))
  const esmWrappers = new Map<string, string>()

  for (const [_entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    const specifier = subpath === '.' ? pkgName : `${pkgName}/${subpath.slice(2)}`
    try {
      const mod = require(specifier)
      const namedExports = Object.keys(mod).filter(
        k => k !== 'default' && k !== '__esModule' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
      )
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

  const wrapperEntries: Record<string, string> = {}
  for (const [entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    const specifier = subpath === '.' ? pkgName : `${pkgName}/${subpath.slice(2)}`
    wrapperEntries[entryName] = `\0esm-wrapper:${specifier}`
  }

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

  const nodeModulesEntries: Record<string, string> = {}

  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      const virtualPath = `/node_modules/.vrowzer-esm/${chunk.fileName}`
      const relPath = relative(sourceDir, resolve(esmDir, chunk.fileName)).replace(/\\/g, '/')
      nodeModulesEntries[virtualPath] = './' + relPath
    }
  }

  // Generate modified package.json for each CJS package
  const pkgExportsMap = new Map<string, Record<string, string>>()
  for (const [entryName, { pkgName, subpath }] of Object.entries(entryToSubpath)) {
    if (!pkgExportsMap.has(pkgName)) {
      pkgExportsMap.set(pkgName, {})
    }
    pkgExportsMap.get(pkgName)![subpath] = `../.vrowzer-esm/${entryName}.js`
  }

  for (const { pkgName, pkg } of cjsPackages) {
    const modifiedExports = pkgExportsMap.get(pkgName) || {}

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

// --- High-level API ---

export interface GenerateManifestLog {
  (message: string): void
}

/**
 * Generate a vrowzer manifest from a project directory.
 *
 * This is the main entry point for manifest generation, used by both
 * the CLI script and the Vrowzer plugin's auto-generation mode.
 */
export async function generateManifest(
  options: GenerateManifestOptions,
  log: GenerateManifestLog = console.log
): Promise<ManifestResult> {
  const { pkgDir, targets = [], includeDevDependencies = false, activeFile } = options
  const sourceDir = options.sourceDir || pkgDir

  // Read package.json
  const pkg = await readPackageJson(pkgDir)
  const name = options.name || pkg.name
  if (!name) {
    throw new Error('No "name" field in package.json. Use the name option to specify.')
  }

  log(`Generating manifest for: ${pkgDir}`)
  if (sourceDir !== pkgDir) {
    log(`  Source directory: ${sourceDir}`)
  }

  // 1. Collect project source files
  const projectFiles = await collectProjectFiles(sourceDir)
  log(`  Project files: ${Object.keys(projectFiles).length}`)

  // 2. Collect dependency packages
  const visited = new Set<string>()
  let depDirs: string[]
  if (targets.length > 0) {
    depDirs = []
    for (const target of targets) {
      const depDir = await resolvePackageDir(target, pkgDir)
      if (!depDir) {
        log(`  Warning: target package "${target}" not found in node_modules`)
        continue
      }
      if (!visited.has(depDir)) {
        visited.add(depDir)
        depDirs.push(depDir)
        const transitive = await collectDependencies(depDir, visited)
        depDirs.push(...transitive)
      }
    }
    log(`  Target packages: ${targets.join(', ')}`)
  } else {
    depDirs = await collectDependencies(pkgDir, visited, includeDevDependencies)
  }
  log(`  Dependencies: ${depDirs.length} packages`)

  // 3. Separate CJS and ESM packages
  const cjsPackages: { pkgName: string; pkg: PackageJson }[] = []
  const nodeModulesFiles: Record<string, string> = {}

  for (const depDir of depDirs) {
    const depPkg = await readPackageJson(depDir)
    const pkgName = depPkg.name
    if (!pkgName) {
      continue
    }

    if (isCjsPackage(depPkg) && depPkg.exports) {
      cjsPackages.push({ pkgName, pkg: depPkg })
    } else {
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
    log(`  CJS packages: ${cjsPackages.map(p => p.pkgName).join(', ')}`)
    const nodeModulesRoot = join(pkgDir, 'node_modules')
    const { nodeModulesEntries } = await bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)
    Object.assign(nodeModulesFiles, nodeModulesEntries)
  }

  log(`  Node modules files: ${Object.keys(nodeModulesFiles).length}`)

  // 5. Build manifest
  const manifest: ManifestResult = { name, files: projectFiles }

  if (Object.keys(nodeModulesFiles).length > 0) {
    manifest.nodeModules = nodeModulesFiles
  }

  const resolvedActiveFile = activeFile || detectActiveFile(projectFiles)
  if (resolvedActiveFile) {
    manifest.activeFile = resolvedActiveFile
  }

  return manifest
}
