/**
 * Rolldown config for @vrowzer/rolldown
 *
 * Pre-bundles @rolldown/browser with all dependencies resolved,
 * replacing internal memfs with @vrowzer/fs.
 *
 * Two build variants:
 *   1. dist/ — @vrowzer/fs is external (consumer provides it)
 *   2. dist/browser/ — @vrowzer/fs is bundled (fully self-contained)
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
import { defineConfig } from 'rolldown'

import type { Plugin } from 'rolldown'

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
 * Replace `@napi-rs/wasm-runtime/fs` with `@vrowzer/fs` at the resolve level.
 *
 * The installed `@napi-rs/wasm-runtime/fs` (dist/fs.js) is a pre-bundled file
 * that has memfs inlined (~21k lines). We can't use transform to replace
 * `from 'memfs'` because it doesn't exist in the bundled dist/fs.js.
 * Instead, we redirect the entire `@napi-rs/wasm-runtime/fs` import to
 * `@vrowzer/fs` which exports the same API surface (including `memfsExported`).
 */
/**
 * Replace `@napi-rs/wasm-runtime/fs` with `@vrowzer/fs` at the resolve level.
 * For variant 1 (external): @vrowzer/fs is marked external (bare specifier kept).
 * For variant 2 (bundled) and worker: resolves to @vrowzer/fs browser build path.
 */
const replaceWasmRuntimeFsExternalPlugin: Plugin = {
  name: 'replace-wasm-runtime-fs-external',
  resolveId: {
    filter: { id: /^@napi-rs\/wasm-runtime\/fs$/ },
    handler() {
      return { id: '@vrowzer/fs', external: true }
    }
  }
}

const replaceWasmRuntimeFsBundledPlugin: Plugin = {
  name: 'replace-wasm-runtime-fs-bundled',
  resolveId: {
    filter: { id: /^@napi-rs\/wasm-runtime\/fs$/ },
    handler() {
      return { id: vrowzerFsSrcPath, external: false }
    }
  }
}

/**
 * Replace `memfs()` factory call with `@vrowzer/fs` singletons in the binding.
 *
 * The original binding (`rolldown-binding.wasi-browser.js`) does:
 *   import { memfs } from '@napi-rs/wasm-runtime/fs'
 *   export const { fs: __fs, vol: __volume } = memfs()
 *
 * This creates a NEW Volume instance, separate from @vrowzer/fs's singleton.
 * We replace it so that rolldown uses the same Volume as @vrowzer/fs:
 *   import { fs as __fs, vol as __volume } from '@vrowzer/fs'
 */
const useSharedFsSingletonPlugin: Plugin = {
  name: 'use-shared-fs-singleton',
  transform: {
    filter: { id: /rolldown-binding\.wasi-browser\.js$/ },
    handler(code) {
      // Replace: import { memfs } from '@napi-rs/wasm-runtime/fs'
      //          export const { fs: __fs, vol: __volume } = memfs()
      // With:    import { fs as __fs, vol as __volume } from '@vrowzer/fs'
      let replaced = code.replace(
        /import\s*\{\s*memfs\s*\}\s*from\s*['"]@napi-rs\/wasm-runtime\/fs['"]/,
        "import { fs as __fs, vol as __volume } from '@vrowzer/fs'"
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

/**
 * Redirect CJS binding to browser binding.
 *
 * `parse-ast-index.mjs` imports `rolldown-binding.wasi.cjs` (Node.js CJS),
 * which contains `require('node:fs')` etc. Redirect to the browser binding
 * (`rolldown-binding.wasi-browser.js`) which uses WASM instead.
 */
const redirectCjsBindingToBrowserPlugin: Plugin = {
  name: 'redirect-cjs-binding-to-browser',
  resolveId: {
    filter: { id: /rolldown-binding\.wasi\.cjs$/ },
    handler(_id, importer) {
      if (!importer) {
        return null
      }
      const dir = dirname(importer)
      return { id: join(dir, '..', 'rolldown-binding.wasi-browser.js'), external: false }
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

    // Generate type declarations for variant 1 (external @vrowzer/fs)
    // memfs uses @vrowzer/fs singletons (fs, vol), so types are precise
    writeFileSync(
      join(distDir, 'index.d.ts'),
      `export { rolldown, type RolldownOptions, type RolldownOutput, type RolldownBuild, VERSION } from '@rolldown/browser'\n`
    )
    writeFileSync(
      join(distDir, 'experimental.d.ts'),
      [
        `import type { IFs } from '@vrowzer/fs'`,
        `import type { Volume } from '@vrowzer/fs'`,
        `export declare const memfs: { fs: IFs; volume: InstanceType<typeof Volume> }`,
        `export { parseSync, parse, type ParseResult, type ParserOptions, transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'`,
        ``
      ].join('\n')
    )

    // Generate type declarations for utils (variant 1)
    writeFileSync(
      join(distDir, 'utils.d.ts'),
      [
        `export { transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'`,
        `export { parse, parseSync, type ParseResult, type ParserOptions } from '@rolldown/browser/experimental'`,
        `export { minify, minifySync, type MinifyOptions, type MinifyResult } from '@rolldown/browser/experimental'`,
        `export { TsconfigCache } from '@rolldown/browser/experimental'`,
        ``
      ].join('\n')
    )

    // Generate type declarations for parseAst (variant 1)
    writeFileSync(
      join(distDir, 'parseAst.d.ts'),
      `export { parseAst, parseAstAsync, type ParseResult, type ParserOptions } from '@rolldown/browser/parseAst'\n`
    )

    // Generate type declarations for variant 2 (bundled @vrowzer/fs)
    mkdirSync(join(distDir, 'browser'), { recursive: true })
    writeFileSync(
      join(distDir, 'browser', 'index.d.ts'),
      `export { rolldown, type RolldownOptions, type RolldownOutput, type RolldownBuild, VERSION } from '@rolldown/browser'\n`
    )
    writeFileSync(
      join(distDir, 'browser', 'experimental.d.ts'),
      `export { memfs, parseSync, parse, type ParseResult, type ParserOptions, transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'\n`
    )
    // Generate type declarations for utils (variant 2)
    writeFileSync(
      join(distDir, 'browser', 'utils.d.ts'),
      [
        `export { transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'`,
        `export { parse, parseSync, type ParseResult, type ParserOptions } from '@rolldown/browser/experimental'`,
        `export { minify, minifySync, type MinifyOptions, type MinifyResult } from '@rolldown/browser/experimental'`,
        `export { TsconfigCache } from '@rolldown/browser/experimental'`,
        ``
      ].join('\n')
    )
    // Generate type declarations for parseAst (variant 2)
    writeFileSync(
      join(distDir, 'browser', 'parseAst.d.ts'),
      `export { parseAst, parseAstAsync, type ParseResult, type ParserOptions } from '@rolldown/browser/parseAst'\n`
    )
  }
}

// ---------------------------------------------------------------------------
// Build configurations
// ---------------------------------------------------------------------------

// Resolve @vrowzer/fs source path via package name (pnpm workspace symlink).
// Use source directly to avoid re-bundling issues with pre-built dist files.
const vrowzerFsPkgPath = fileURLToPath(import.meta.resolve('@vrowzer/fs/package.json'))
const vrowzerFsSrcPath = join(dirname(vrowzerFsPkgPath), 'src', 'index.ts')

const commonResolve = {
  conditionNames: ['browser', 'import', 'module', 'default']
}

const bundledResolve = {
  ...commonResolve,
  alias: {
    '@vrowzer/fs': vrowzerFsSrcPath,
    // Node.js module aliases for browser compatibility (same as @vrowzer/fs tsdown config)
    'node:events': '@vrowzer/node-polyfill/events',
    'node:path': 'pathe',
    'node:stream': 'readable-stream',
    'node:buffer': 'buffer',
    buffer: 'buffer',
    events: '@vrowzer/node-polyfill/events',
    path: 'pathe',
    stream: 'readable-stream',
    process: '@vrowzer/node-polyfill/process'
  }
}

export default defineConfig([
  // 1. Worker script (shared by both variants, @vrowzer/fs always bundled)
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

  // 2. Variant 1: @vrowzer/fs external
  //    Consumer provides @vrowzer/fs, allowing shared memfs instances.
  {
    input: {
      index: join(rolldownDist, 'index.browser.mjs'),
      experimental: join(rolldownDist, 'experimental-index.browser.mjs'),
      parseAst: join(rolldownDist, 'parse-ast-index.mjs'),
      utils: join(__dirname, 'src/utils.ts')
    },
    platform: 'browser',
    resolve: commonResolve,
    plugins: [
      redirectCjsBindingToBrowserPlugin,
      useSharedFsSingletonPlugin,
      replaceWasmRuntimeFsExternalPlugin,
      replaceNodeGlobalsPlugin,
      rewriteUrlsPlugin,
      postBuildPlugin
    ],
    external: [/\.wasm$/, /^@vrowzer\/fs/],
    output: {
      dir: distDir,
      format: 'esm',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      minify: false
    }
  },

  // 3. Variant 2: @vrowzer/fs bundled (fully self-contained)
  //    No additional dependencies needed.
  {
    input: {
      index: join(rolldownDist, 'index.browser.mjs'),
      experimental: join(rolldownDist, 'experimental-index.browser.mjs'),
      parseAst: join(rolldownDist, 'parse-ast-index.mjs'),
      utils: join(__dirname, 'src/utils.ts')
    },
    platform: 'browser',
    resolve: bundledResolve,
    plugins: [
      redirectCjsBindingToBrowserPlugin,
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
