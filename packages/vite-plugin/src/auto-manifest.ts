/**
 * Auto-manifest plugin for Vrowzer.
 *
 * When `auto: true`, this plugin:
 * 1. Auto-generates the vrowzer manifest in `configResolved`
 * 2. Caches results in `node_modules/.vrowzer-manifest/`
 * 3. Provides the manifest via `virtual:vrowzer-manifest` virtual module
 *
 * @module auto-manifest
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { minifySync } from 'rolldown/experimental'
import { createDebug } from 'obug'
import { generateManifest } from './manifest-generate.ts'

import type { Plugin, ResolvedConfig } from 'vite'
import type { ManifestResult } from './manifest-generate.ts'
import type { VrowzerManifestOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowzer:auto-manifest')

const VIRTUAL_MODULE_ID = 'virtual:vrowzer-manifest'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const CACHE_DIR_NAME = '.vrowzer-manifest'
const MANIFEST_FILENAME = 'manifest.json'
const HASH_FILENAME = '_hash'

const LOCKFILE_NAMES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock']

const MINIFIABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs'])

/**
 * Simple 32-bit string hash (same algorithm as unplugin-service-worker hash).
 */
function hash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    h = (h << 5) - h + char
    h = h & h
  }
  return Math.abs(h).toString(36).slice(0, 8)
}

/**
 * Compute cache key from package.json dependencies, lockfile, and manifest options.
 */
function computeCacheHash(root: string, manifestOptions?: VrowzerManifestOptions): string {
  const parts: string[] = []

  // Include sourceDir in cache key so changes to it invalidate the cache
  if (manifestOptions?.sourceDir) {
    parts.push(`sourceDir:${manifestOptions.sourceDir}`)
  }
  if (manifestOptions?.targets) {
    parts.push(`targets:${manifestOptions.targets.join(',')}`)
  }

  // Read package.json deps
  const pkgPath = join(root, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      parts.push(JSON.stringify(pkg.dependencies || {}))
      parts.push(JSON.stringify(pkg.devDependencies || {}))
    } catch {
      // ignore
    }
  }

  // Read lockfile
  for (const lockfile of LOCKFILE_NAMES) {
    const lockPath = join(root, lockfile)
    if (existsSync(lockPath)) {
      try {
        parts.push(readFileSync(lockPath, 'utf-8'))
      } catch {
        // ignore
      }
      break
    }
  }

  return hash(parts.join('\n'))
}

function getCacheDir(root: string): string {
  return resolve(root, 'node_modules', CACHE_DIR_NAME)
}

function readCachedHash(cacheDir: string): string | null {
  const hashPath = join(cacheDir, HASH_FILENAME)
  if (existsSync(hashPath)) {
    try {
      return readFileSync(hashPath, 'utf-8').trim()
    } catch {
      return null
    }
  }
  return null
}

function readCachedManifest(cacheDir: string): ManifestResult | null {
  const manifestPath = join(cacheDir, MANIFEST_FILENAME)
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function writeCache(cacheDir: string, manifest: ManifestResult, cacheHash: string): void {
  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(join(cacheDir, MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n')
  writeFileSync(join(cacheDir, HASH_FILENAME), cacheHash + '\n')
}

/**
 * Resolve manifest path references to actual file contents.
 * This is equivalent to what VrowzerManifest() does for manual manifests.
 */
function resolveManifestContents(
  manifest: ManifestResult,
  manifestDir: string
): Record<string, any> {
  function resolveFiles(
    files: Record<string, string> | undefined,
    minify: boolean
  ): Record<string, string> {
    if (!files) {
      return {}
    }
    const resolved: Record<string, string> = {}
    for (const [virtualPath, relPath] of Object.entries(files)) {
      try {
        let content = readFileSync(resolve(manifestDir, relPath), 'utf-8')
        if (minify && MINIFIABLE_EXTENSIONS.has(extname(virtualPath))) {
          const result = minifySync(virtualPath, content)
          if (result.code) {
            content = result.code
          }
        }
        resolved[virtualPath] = content
      } catch {
        debug('failed to read %s', relPath)
      }
    }
    return resolved
  }

  return {
    name: manifest.name,
    files: resolveFiles(manifest.files, false),
    nodeModules: resolveFiles(manifest.nodeModules, true),
    activeFile: manifest.activeFile
  }
}

/**
 * Create the auto-manifest plugin.
 *
 * This plugin is included in the `Vrowzer()` array when `auto: true`.
 */
export function autoManifestPlugin(manifestOptions?: VrowzerManifestOptions): Plugin {
  let sourceDir: string
  let manifest: ManifestResult | null = null

  return {
    name: 'vrowzer:auto-manifest',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    async configResolved(config: ResolvedConfig) {
      const root = config.root
      sourceDir = manifestOptions?.sourceDir ? resolve(root, manifestOptions.sourceDir) : root
      const pkgDir = manifestOptions?.pkgDir ? resolve(root, manifestOptions.pkgDir) : root

      const cacheDir = getCacheDir(root)
      const currentHash = computeCacheHash(pkgDir, manifestOptions)
      const cachedHash = readCachedHash(cacheDir)

      if (currentHash === cachedHash) {
        // Cache hit
        manifest = readCachedManifest(cacheDir)
        if (manifest) {
          debug('cache hit (hash: %s), using cached manifest', currentHash)
          return
        }
      }

      // Cache miss — generate manifest
      debug('cache miss (current: %s, cached: %s), generating manifest...', currentHash, cachedHash)

      manifest = await generateManifest(
        {
          pkgDir,
          sourceDir,
          ...(manifestOptions?.targets ? { targets: manifestOptions.targets } : {})
        },
        msg => debug(msg)
      )

      // Write cache
      writeCache(cacheDir, manifest, currentHash)
      debug('manifest cached to %s', cacheDir)
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return
      }

      if (!manifest) {
        debug('no manifest available')
        return { code: 'export default {}', moduleType: 'js' }
      }

      // Resolve path references to actual file contents
      // Use the manifest dir (cache dir) as the base for path resolution,
      // but since paths in the manifest are relative to sourceDir (= projectRoot),
      // we use projectRoot as the base.
      const resolved = resolveManifestContents(manifest, sourceDir)

      debug(
        'virtual module loaded: %s (%d files, %d nodeModules)',
        resolved.name,
        Object.keys(resolved.files).length,
        Object.keys(resolved.nodeModules || {}).length
      )

      return {
        code: `export default ${JSON.stringify(resolved)}`,
        moduleType: 'js'
      }
    }
  }
}
