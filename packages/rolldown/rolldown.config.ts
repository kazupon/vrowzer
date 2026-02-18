/**
 * Rolldown config for @vrowser/rolldown
 *
 * Pre-bundles @rolldown/browser with all dependencies resolved,
 * replacing internal memfs with @vrowser/fs.
 *
 * Two build variants:
 *   1. dist/ — @vrowser/fs is external (consumer provides it)
 *   2. dist/browser/ — @vrowser/fs is bundled (fully self-contained)
 *
 * Shared files:
 *   dist/worker.js                         — Bundled WASI worker script
 *   dist/rolldown-binding.wasm32-wasi.wasm — WASM binary
 *
 * IMPORTANT: index.js and experimental.js MUST share the same binding
 * instance (memfs, WASM runtime). They are bundled together with code
 * splitting so the binding is in a shared chunk.
 */

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'rolldown'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')

// Resolve @rolldown/browser dist directory
function resolveRolldownDist(): string {
  const pkgPath = resolve(__dirname, 'node_modules/@rolldown/browser/package.json')
  return join(dirname(pkgPath), 'dist')
}

const rolldownDist = resolveRolldownDist()

// IPC buffer size for fs-proxy (default: 16 + 10240 = 10256 bytes ≈ 10KB)
// Increase to 10MB to handle larger source files in Worker threads
const FS_PROXY_BUFFER_SIZE = 16 + 10 * 1024 * 1024

// ---------------------------------------------------------------------------
// Shared plugins
// ---------------------------------------------------------------------------

/**
 * Replace `@napi-rs/wasm-runtime/fs` with `@vrowser/fs` at the resolve level.
 *
 * The installed `@napi-rs/wasm-runtime/fs` (dist/fs.js) is a pre-bundled file
 * that has memfs inlined (~21k lines). We can't use transform to replace
 * `from 'memfs'` because it doesn't exist in the bundled dist/fs.js.
 * Instead, we redirect the entire `@napi-rs/wasm-runtime/fs` import to
 * `@vrowser/fs` which exports the same API surface (including `memfsExported`).
 */
/**
 * Replace `@napi-rs/wasm-runtime/fs` with `@vrowser/fs` at the resolve level.
 * For variant 1 (external): @vrowser/fs is marked external (bare specifier kept).
 * For variant 2 (bundled) and worker: resolves to @vrowser/fs browser build path.
 */
const replaceWasmRuntimeFsExternalPlugin: Plugin = {
  name: 'replace-wasm-runtime-fs-external',
  resolveId: {
    filter: { id: /^@napi-rs\/wasm-runtime\/fs$/ },
    handler() {
      return { id: '@vrowser/fs', external: true }
    }
  }
}

const replaceWasmRuntimeFsBundledPlugin: Plugin = {
  name: 'replace-wasm-runtime-fs-bundled',
  resolveId: {
    filter: { id: /^@napi-rs\/wasm-runtime\/fs$/ },
    handler() {
      return { id: vrowserFsSrcPath, external: false }
    }
  }
}

/**
 * Replace `memfs()` factory call with `@vrowser/fs` singletons in the binding.
 *
 * The original binding (`rolldown-binding.wasi-browser.js`) does:
 *   import { memfs } from '@napi-rs/wasm-runtime/fs'
 *   export const { fs: __fs, vol: __volume } = memfs()
 *
 * This creates a NEW Volume instance, separate from @vrowser/fs's singleton.
 * We replace it so that rolldown uses the same Volume as @vrowser/fs:
 *   import { fs as __fs, vol as __volume } from '@vrowser/fs'
 */
const useSharedFsSingletonPlugin: Plugin = {
  name: 'use-shared-fs-singleton',
  transform: {
    filter: { id: /rolldown-binding\.wasi-browser\.js$/ },
    handler(code) {
      // Replace: import { memfs } from '@napi-rs/wasm-runtime/fs'
      //          export const { fs: __fs, vol: __volume } = memfs()
      // With:    import { fs as __fs, vol as __volume } from '@vrowser/fs'
      let replaced = code.replace(
        /import\s*\{\s*memfs\s*\}\s*from\s*['"]@napi-rs\/wasm-runtime\/fs['"]/,
        "import { fs as __fs, vol as __volume } from '@vrowser/fs'"
      )
      replaced = replaced.replace(
        /export\s+const\s*\{\s*fs:\s*__fs,\s*vol:\s*__volume\s*\}\s*=\s*memfs\(\)/,
        'export { __fs, __volume }'
      )
      if (replaced === code) {
        return null
      }
      return { code: replaced, moduleType: 'js' }
    }
  }
}

const replaceNodeGlobalsPlugin: Plugin = {
  name: 'replace-node-globals',
  transform: {
    filter: { code: /process\.cwd|process\.env/ },
    handler(code) {
      const replaced = code
        .replace(/process\.cwd\(\)/g, '"/"')
        .replace(/process\.env\.NODE_ENV/g, '"production"')
      if (replaced === code) {
        return null
      }
      return { code: replaced, moduleType: 'js' }
    }
  }
}

/**
 * Increases the fs-proxy SharedArrayBuffer size in @napi-rs/wasm-runtime.
 */
const expandFsProxyBufferPlugin: Plugin = {
  name: 'expand-fs-proxy-buffer',
  transform: {
    filter: { id: /fs-proxy\.js$/ },
    handler(code) {
      const replaced = code
        .replace(
          /new SharedArrayBuffer\(16\s*\+\s*10240\)/g,
          `new SharedArrayBuffer(${FS_PROXY_BUFFER_SIZE})`
        )
        .replace(
          /new SharedArrayBuffer\(10256\)/g,
          `new SharedArrayBuffer(${FS_PROXY_BUFFER_SIZE})`
        )
      if (replaced === code) {
        return null
      }
      return { code: replaced, moduleType: 'js' }
    }
  }
}

/**
 * Rewrite Worker and WASM URLs in the binding file.
 *
 * After code splitting, the binding code ends up in a chunk inside a `chunks/`
 * subdirectory. The URLs must account for this relative path offset.
 * Uses `'' + import.meta.url` to prevent Vite/rolldown from detecting
 * `new URL('...', import.meta.url)` and trying to process it as a worker.
 *
 * @param prefix - Path prefix from the chunk to dist root
 *   Variant 1 (dist/chunks/ → dist/): '../'
 *   Variant 2 (dist/browser/chunks/ → dist/): '../../'
 */
function createRewriteUrlsPlugin(prefix: string): Plugin {
  return {
    name: 'rewrite-urls',
    transform: {
      filter: { id: /rolldown-binding\.wasi-browser\.js$/ },
      handler(code) {
        const replaced = code
          .replace(
            /new URL\(['"]\.\/wasi-worker-browser\.mjs['"],\s*import\.meta\.url\)/g,
            `new URL('${prefix}worker.js', '' + import.meta.url)`
          )
          .replace(
            /new URL\(['"]\.\/rolldown-binding\.wasm32-wasi\.wasm['"],\s*import\.meta\.url\)/g,
            `new URL('${prefix}rolldown-binding.wasm32-wasi.wasm', '' + import.meta.url)`
          )
        if (replaced === code) {
          return null
        }
        return { code: replaced, moduleType: 'js' }
      }
    }
  }
}

// Variant 1: chunk is in dist/chunks/, Worker/WASM in dist/
const rewriteUrlsPlugin = createRewriteUrlsPlugin('../')
// Variant 2: chunk is in dist/browser/chunks/, Worker/WASM in dist/
const rewriteUrlsForBrowserPlugin = createRewriteUrlsPlugin('../../')

/**
 * Plugin that copies WASM binary and generates type declaration files.
 */
const postBuildPlugin: Plugin = {
  name: 'post-build',
  writeBundle() {
    // Copy WASM binary
    mkdirSync(distDir, { recursive: true })
    copyFileSync(
      join(rolldownDist, 'rolldown-binding.wasm32-wasi.wasm'),
      join(distDir, 'rolldown-binding.wasm32-wasi.wasm')
    )

    // Generate type declarations for variant 1 (external @vrowser/fs)
    writeFileSync(
      join(distDir, 'index.d.ts'),
      `export { rolldown, type RolldownOptions, type RolldownOutput, type RolldownBuild, VERSION } from '@rolldown/browser'\n`
    )
    writeFileSync(
      join(distDir, 'experimental.d.ts'),
      `export { memfs, parseSync, parse, type ParseResult, type ParserOptions, transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'\n`
    )

    // Generate type declarations for variant 2 (bundled @vrowser/fs)
    mkdirSync(join(distDir, 'browser'), { recursive: true })
    writeFileSync(
      join(distDir, 'browser', 'index.d.ts'),
      `export { rolldown, type RolldownOptions, type RolldownOutput, type RolldownBuild, VERSION } from '@rolldown/browser'\n`
    )
    writeFileSync(
      join(distDir, 'browser', 'experimental.d.ts'),
      `export { memfs, parseSync, parse, type ParseResult, type ParserOptions, transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'\n`
    )
  }
}

// ---------------------------------------------------------------------------
// Build configurations
// ---------------------------------------------------------------------------

// Resolve @vrowser/fs source path via package name (pnpm workspace symlink).
// Use source directly to avoid re-bundling issues with pre-built dist files.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const vrowserFsPkgPath = require.resolve('@vrowser/fs/package.json')
const vrowserFsSrcPath = join(dirname(vrowserFsPkgPath), 'src', 'index.ts')

const commonResolve = {
  conditionNames: ['browser', 'import', 'module', 'default']
}

const bundledResolve = {
  ...commonResolve,
  alias: {
    '@vrowser/fs': vrowserFsSrcPath,
    // Node.js module aliases for browser compatibility (same as @vrowser/fs tsdown config)
    'node:events': '@vrowser/node-polyfill/events',
    'node:path': 'pathe',
    'node:stream': 'readable-stream',
    'node:buffer': 'buffer',
    buffer: 'buffer',
    events: '@vrowser/node-polyfill/events',
    path: 'pathe',
    stream: 'readable-stream',
    process: '@vrowser/node-polyfill/process'
  }
}

export default defineConfig([
  // 1. Worker script (shared by both variants, @vrowser/fs always bundled)
  {
    input: join(rolldownDist, 'wasi-worker-browser.mjs'),
    platform: 'browser',
    resolve: bundledResolve,
    plugins: [replaceWasmRuntimeFsBundledPlugin, expandFsProxyBufferPlugin],
    output: {
      file: join(distDir, 'worker.js'),
      format: 'esm',
      minify: false
    }
  },

  // 2. Variant 1: @vrowser/fs external
  //    Consumer provides @vrowser/fs, allowing shared memfs instances.
  {
    input: {
      index: join(rolldownDist, 'index.browser.mjs'),
      experimental: join(rolldownDist, 'experimental-index.browser.mjs')
    },
    platform: 'browser',
    resolve: commonResolve,
    plugins: [
      useSharedFsSingletonPlugin,
      replaceWasmRuntimeFsExternalPlugin,
      replaceNodeGlobalsPlugin,
      rewriteUrlsPlugin,
      postBuildPlugin
    ],
    external: [/\.wasm$/, /^@vrowser\/fs/],
    output: {
      dir: distDir,
      format: 'esm',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      minify: false
    }
  },

  // 3. Variant 2: @vrowser/fs bundled (fully self-contained)
  //    No additional dependencies needed.
  {
    input: {
      index: join(rolldownDist, 'index.browser.mjs'),
      experimental: join(rolldownDist, 'experimental-index.browser.mjs')
    },
    platform: 'browser',
    resolve: bundledResolve,
    plugins: [
      useSharedFsSingletonPlugin,
      replaceWasmRuntimeFsBundledPlugin,
      replaceNodeGlobalsPlugin,
      rewriteUrlsForBrowserPlugin
    ],
    external: [/\.wasm$/],
    output: {
      dir: join(distDir, 'browser'),
      format: 'esm',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      minify: false
    }
  }
])
