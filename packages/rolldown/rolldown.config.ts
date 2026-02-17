/**
 * Rolldown config for @vrowser/rolldown
 *
 * Pre-bundles @rolldown/browser with all dependencies resolved,
 * so that it can be used with a simple `import` in the browser.
 *
 * Output:
 *   dist/index.mjs              - Main entry (rolldown API)
 *   dist/experimental.mjs       - Experimental entry (memfs, parseSync, etc.)
 *   dist/chunks/                - Shared chunks (binding, wasm-runtime, etc.)
 *   dist/worker.mjs             - Bundled worker script (bare specifiers resolved)
 *   dist/rolldown-binding.wasm32-wasi.wasm - WASM binary (copied)
 *
 * IMPORTANT: index.mjs and experimental.mjs MUST share the same binding
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

// Shared plugins

const replaceNodeGlobalsPlugin: Plugin = {
  name: 'replace-node-globals',
  transform: {
    filter: { code: /process\.cwd|process\.env/ },
    handler(code) {
      const replaced = code
        .replace(/process\.cwd\(\)/g, '"/"')
        .replace(/process\.env\.NODE_ENV/g, '"production"')
      if (replaced === code) return null
      return { code: replaced, moduleType: 'js' }
    }
  }
}

/**
 * Increases the fs-proxy SharedArrayBuffer size in @napi-rs/wasm-runtime.
 *
 * The default buffer is 16 + 10240 bytes (~10KB), which limits the maximum
 * file size that can be read/written via IPC between Worker threads and the
 * main thread's memfs. This plugin replaces the fixed buffer size with a
 * larger value to support typical source files.
 */
const expandFsProxyBufferPlugin: Plugin = {
  name: 'expand-fs-proxy-buffer',
  transform: {
    filter: { id: /fs-proxy\.js$/ },
    handler(code) {
      // Match: new SharedArrayBuffer(16 + 10240) or new SharedArrayBuffer(10256)
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

const rewriteWorkerUrlPlugin: Plugin = {
  name: 'rewrite-worker-url',
  transform: {
    filter: { id: /rolldown-binding\.wasi-browser\.js$/ },
    handler(code) {
      // Rewrite Worker URL: ./wasi-worker-browser.mjs → ./worker.mjs
      // Use string concatenation to prevent Vite/rolldown from detecting
      // `new URL('...', import.meta.url)` pattern and trying to process it as a worker.
      const replaced = code.replace(
        /new URL\(['"]\.\/wasi-worker-browser\.mjs['"],\s*import\.meta\.url\)/g,
        "new URL('./worker.js', '' + import.meta.url)"
      )
      if (replaced === code) return null
      return { code: replaced, moduleType: 'js' }
    }
  }
}

/**
 * Plugin that copies WASM binary and generates type declaration files
 * after the main bundle is written.
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

    // Generate type declaration files
    writeFileSync(
      join(distDir, 'index.d.ts'),
      `export { rolldown, type RolldownOptions, type RolldownOutput, type RolldownBuild, VERSION } from '@rolldown/browser'\n`
    )
    writeFileSync(
      join(distDir, 'experimental.d.ts'),
      `export { memfs, parseSync, parse, type ParseResult, type ParserOptions, transform, transformSync, type TransformOptions, type TransformResult } from '@rolldown/browser/experimental'\n`
    )
  }
}

export default defineConfig([
  // 1. Bundle the worker script (resolve bare specifiers)
  {
    input: join(rolldownDist, 'wasi-worker-browser.mjs'),
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    },
    plugins: [expandFsProxyBufferPlugin],
    output: {
      file: join(distDir, 'worker.js'),
      format: 'esm',
      minify: false
    }
  },
  // 2. Bundle main + experimental entries together with code splitting
  //    Both entries MUST share the same binding instance (memfs, WASM runtime).
  {
    input: {
      index: join(rolldownDist, 'index.browser.mjs'),
      experimental: join(rolldownDist, 'experimental-index.browser.mjs')
    },
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    },
    plugins: [replaceNodeGlobalsPlugin, rewriteWorkerUrlPlugin, postBuildPlugin],
    external: [/\.wasm$/],
    output: {
      dir: distDir,
      format: 'esm',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      minify: false
    }
  }
])
