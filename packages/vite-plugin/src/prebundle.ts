/**
 * Pre-bundle Worker config using rolldown.
 *
 * Takes the extracted Worker source from extract.ts and bundles it
 * into node_modules/.vrowzer/ for Worker consumption.
 *
 * @module prebundle
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire as nodeCreateRequire } from 'node:module'
import { rolldown } from 'rolldown'
import { createDebug } from 'obug'
import { resolveAliases } from './alias.ts'

import type { Plugin as RolldownPlugin } from 'rolldown'

const debug = createDebug('vite-plugin-vrowzer:prebundle')

export interface PrebundleOptions {
  /** Generated Worker config source code */
  workerSource: string
  /** Project root directory */
  root: string
  /** Directory of the original vite.config.ts (for resolving import.meta.dirname) */
  configDir: string
}

const OUTPUT_DIR_NAME = '.vrowzer'
const BUNDLED_FILENAME = 'config.bundled.mjs'

/**
 * Resolve the output directory path for prebundled Worker config.
 */
export function resolveOutputDir(root: string): string {
  return resolve(root, 'node_modules', OUTPUT_DIR_NAME)
}

/**
 * Remove the prebundle output directory.
 */
export function cleanOutputDir(root: string): void {
  const outputDir = resolveOutputDir(root)
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true })
    debug('cleaned output dir:', outputDir)
  }
}

/**
 * Pre-bundle Worker config source using rolldown.
 *
 * @returns Absolute path to the bundled config file.
 */
export async function prebundleWorkerConfig(options: PrebundleOptions): Promise<string> {
  const { workerSource, root, configDir } = options
  const outputDir = resolveOutputDir(root)
  const bundledPath = resolve(outputDir, BUNDLED_FILENAME)

  debug('prebundling worker config...')

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true })

  // Write temporary entry file (.mts for TypeScript support — rolldown handles TS natively)
  const entryPath = resolve(outputDir, '_entry.mts')
  writeFileSync(entryPath, workerSource)

  // Bundle with rolldown
  const bundle = await rolldown({
    input: entryPath,
    external: [new RegExp('^@vrowzer/'), 'assert', 'v8'],
    // Define process.env.NODE_ENV so plugin code doesn't need runtime process global
    transform: {
      define: {
        'process.env.NODE_ENV': JSON.stringify('development'),
        global: 'globalThis'
      },
      inject: {
        process: '@vrowzer/node-polyfill/process'
      }
    },
    // Map Node.js builtins to browser polyfills and vite to vrowzer's shim.
    // These are resolved at prebundle time and the aliases appear as external
    // imports in the output (resolved by host Vite's resolve.alias at serve time).
    resolve: {
      alias: resolveAliases({
        // Only node:process is aliased here — bare `process` stays as-is.
        // Host Vite's @rollup/plugin-inject or resolve.alias handles it at serve time.
        'node:process': '@vrowzer/node-polyfill/process'
      }),
      mainFields: ['module', 'main'],
      conditionNames: ['browser', 'import', 'default']
    },
    platform: 'neutral',
    plugins: [viteAliasPlugin(), inlineReadFileSyncPlugin(configDir), inlineCreateRequirePlugin()]
  })

  await bundle.write({
    format: 'esm',
    dir: outputDir,
    entryFileNames: BUNDLED_FILENAME,
    chunkFileNames: 'chunks/[name].mjs',
    minify: false
  })

  debug('prebundle complete:', bundledPath)

  return bundledPath
}

/**
 * Rolldown plugin to redirect `vite` imports to `@vrowzer/vite-dev-server/vite`.
 * Handles both exact `vite` and subpaths like `vite/internal`.
 */
function viteAliasPlugin(): RolldownPlugin {
  const VITE_INTERNAL_ID = '\0vrowzer:vite-internal-stub'
  return {
    name: 'vrowzer:vite-alias',
    resolveId(id) {
      if (id === 'vite') {
        return { id: '@vrowzer/vite-dev-server/vite', external: true }
      }
      // vite/internal is a Rolldown Vite 8 internal — stub it out
      if (id === 'vite/internal') {
        return { id: VITE_INTERNAL_ID, external: false }
      }
      if (id.startsWith('vite/')) {
        return { id: id.replace(/^vite\//, '@vrowzer/vite-dev-server/vite/'), external: true }
      }
    },
    load(id) {
      if (id === VITE_INTERNAL_ID) {
        return 'export {}'
      }
    }
  }
}

/**
 * Rolldown plugin to inline `readFileSync(...)` calls at prebundle time.
 *
 * When the Worker config source contains `readFileSync(path, 'utf-8')`,
 * this plugin evaluates the call at prebundle time (Node.js) and replaces
 * it with the file content as a string literal. This is necessary because
 * Worker environments cannot access the host filesystem.
 *
 * Supported patterns:
 *   readFileSync('literal/path', 'utf-8')
 *   readFileSync(resolve(import.meta.dirname, 'path'), 'utf-8')
 */
function inlineReadFileSyncPlugin(configDir: string): RolldownPlugin {
  // Match: readFileSync( <expr> , 'utf-8') or readFileSync( <expr> , "utf-8")
  // Uses [\s\S]+? to handle multiline expressions (e.g. resolve(dir, 'path') on separate lines)
  const RE = /readFileSync\(\s*([\s\S]+?)\s*,\s*['"]utf-?8['"]\s*\)/g

  return {
    name: 'vrowzer:inline-readFileSync',
    transform(code, id) {
      // Only process the entry file, not dependencies
      if (!id.includes('_entry.mt') && !id.includes('.vrowzer/')) {
        return
      }
      if (!code.includes('readFileSync')) {
        return
      }

      let modified = false
      const result = code.replace(RE, (match, pathExpr: string) => {
        const resolvedPath = tryEvalPathExpr(pathExpr.trim(), configDir)
        if (!resolvedPath) {
          debug('inlineReadFileSync: could not evaluate path expr:', pathExpr)
          return match
        }

        try {
          const content = readFileSync(resolvedPath, 'utf-8')
          modified = true
          debug('inlineReadFileSync: inlined', resolvedPath, `(${content.length} bytes)`)
          return JSON.stringify(content)
        } catch (e) {
          debug('inlineReadFileSync: failed to read:', resolvedPath, e)
          return match
        }
      })

      if (modified) {
        // Remove now-unused node:fs and node:path imports
        const cleaned = result
          .replace(/import\s*\{[^}]*readFileSync[^}]*\}\s*from\s*['"]node:fs['"]\s*;?\n?/g, '')
          .replace(/import\s*\{[^}]*resolve[^}]*\}\s*from\s*['"]node:path['"]\s*;?\n?/g, '')
        return { code: cleaned, map: null }
      }
    }
  }
}

/**
 * Try to evaluate a path expression to an absolute path string.
 */
function tryEvalPathExpr(expr: string, configDir: string): string | null {
  // Case 1: Simple string literal
  const strMatch = expr.match(/^['"](.+)['"]$/)
  if (strMatch) {
    return resolve(configDir, strMatch[1]!)
  }

  // Case 2: resolve(import.meta.dirname, 'path') or resolve(__dirname, 'path')
  const resolveMatch = expr.match(
    /^resolve\(\s*(?:import\.meta\.dirname|__dirname)\s*,\s*['"](.+)['"]\s*\)$/
  )
  if (resolveMatch) {
    return resolve(configDir, resolveMatch[1]!)
  }

  return null
}

/**
 * Rolldown plugin to inline `createRequire(...)("pkg/path")` calls at prebundle time.
 *
 * Some plugins (e.g. @sveltejs/vite-plugin-svelte) use `createRequire` at module
 * init time to load package.json files. This fails in Worker environments where
 * `require()` is not available. This plugin detects the pattern and replaces it
 * with the actual file content at prebundle time.
 */
function inlineCreateRequirePlugin(): RolldownPlugin {
  // Match: createRequire(import.meta.url)("some/package.json")
  const RE = /createRequire\([^)]+\)\(\s*['"]([^'"]+)['"]\s*\)/g

  return {
    name: 'vrowzer:inline-createRequire',
    transform(code, id) {
      if (!code.includes('createRequire')) {
        return
      }

      let modified = false
      const result = code.replace(RE, (match, specifier: string) => {
        // Only inline JSON files (package.json etc.)
        if (!specifier.endsWith('.json')) {
          return match
        }

        try {
          // Resolve from the file that contains the createRequire call
          const req = nodeCreateRequire(id)
          const resolvedPath = req.resolve(specifier)
          const content = readFileSync(resolvedPath, 'utf-8')
          modified = true
          debug('inlineCreateRequire: inlined', specifier, 'from', id)
          return JSON.stringify(JSON.parse(content))
        } catch {
          debug('inlineCreateRequire: could not resolve', specifier, 'from', id)
          return match
        }
      })

      if (modified) {
        return { code: result, map: null }
      }
    }
  }
}
