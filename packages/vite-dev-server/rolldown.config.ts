// import { readFileSync, writeFileSync } from 'node:fs'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// import MagicString from 'magic-string'
// import type { Plugin } from 'rolldown'
import { defineConfig } from 'rolldown'
// import { init, parse } from 'es-module-lexer'
// import licensePlugin from './rollupLicensePlugin'

// const pkg = JSON.parse(
//   readFileSync(new URL('./package.json', import.meta.url)).toString(),
// )
const __dirname = fileURLToPath(new URL('.', import.meta.url))
// const disableSourceMap = !!process.env.DEBUG_DISABLE_SOURCE_MAP

// TODO(kazupon): we mignt not need this for vrowser
const envConfig = defineConfig({
  input: path.resolve(__dirname, 'src/client/env.ts'),
  platform: 'browser',
  transform: {
    target: 'es2020'
  },
  output: {
    dir: path.resolve(__dirname, 'dist'),
    entryFileNames: 'client/env.mjs'
  }
})

const clientConfig = defineConfig({
  input: path.resolve(__dirname, 'src/client/client.ts'),
  platform: 'browser',
  transform: {
    target: 'es2020'
  },
  external: ['@vite/env'],
  output: {
    dir: path.resolve(__dirname, 'dist'),
    entryFileNames: 'client/client.mjs'
  }
})

const sharedNodeOptions = defineConfig({
  platform: 'browser',
  resolve: {
    alias: {
      // TODO(kazupon): don't do polyfill here
      // 'node:path': 'pathe',
      // 'path': 'pathe',
      // 'node:fs': '@vrowser/fs',
      // 'node:fs/promises': '@vrowser/fs/promises',
      // 'fs': '@vrowser/fs',
      // 'fs/promises': '@vrowser/fs/promises',
      // 'node:url': '@kazupon/jts-utils/url',
      // 'url': '@kazupon/jts-utils/url',
    }
  },
  transform: {
    define: {
      'process.platform': JSON.stringify('browser') // for `tinyglobby` polyfill
    }
  },
  treeshake: {
    moduleSideEffects: [
      {
        test: /acorn|astring|escape-html/,
        sideEffects: false
      },
      {
        external: true,
        sideEffects: false
      }
    ],
    propertyReadSideEffects: false
  },
  output: {
    dir: './dist',
    entryFileNames: `node/[name].js`,
    chunkFileNames: 'node/chunks/[name].js',
    exports: 'named',
    format: 'esm',
    externalLiveBindings: false
  },
  onwarn(warning, warn) {
    if (warning.message.includes('Circular dependency')) {
      return
    }
    warn(warning)
  }
})

const nodeConfig = defineConfig({
  ...sharedNodeOptions,
  input: {
    index: path.resolve(__dirname, 'src/node/index.ts'),
    cli: path.resolve(__dirname, 'src/node/cli.ts'),
    internal: path.resolve(__dirname, 'src/node/internalIndex.ts')
  }
  // external: [
  //   /^vite\//,
  //   'fsevents',
  //   /^rolldown\//,
  //   /^tsx\//,
  //   /^#/,
  //   'sugarss', // postcss-import -> sugarss
  //   'supports-color',
  //   'utf-8-validate', // ws
  //   'bufferutil', // ws
  //   ...Object.keys(pkg.dependencies),
  //   ...Object.keys(pkg.peerDependencies),
  // ],
  // plugins: [
  //   shimDepsPlugin({
  //     'postcss-load-config/src/req.js': [
  //       {
  //         src: "const { pathToFileURL } = require('node:url')",
  //         replacement: `const { fileURLToPath, pathToFileURL } = require('node:url')`,
  //       },
  //       {
  //         src: '__filename',
  //         replacement: 'fileURLToPath(import.meta.url)',
  //       },
  //     ],
  //     // postcss-import uses the `resolve` dep if the `resolve` option is not passed.
  //     // However, we always pass the `resolve` option. It also uses `read-cache` if
  //     // the `load` option is not passed, but we also always pass the `load` option.
  //     // Remove these two imports to avoid bundling them.
  //     'postcss-import/index.js': [
  //       {
  //         src: 'const resolveId = require("./lib/resolve-id")',
  //         replacement: 'const resolveId = (id) => id',
  //       },
  //       {
  //         src: 'const loadContent = require("./lib/load-content")',
  //         replacement: 'const loadContent = () => ""',
  //       },
  //     ],
  //     'postcss-import/lib/parse-styles.js': [
  //       {
  //         src: 'const resolveId = require("./resolve-id")',
  //         replacement: 'const resolveId = (id) => id',
  //       },
  //     ],
  //   }),
  //   buildTimeImportMetaUrlPlugin(),
  //   licensePlugin(
  //     path.resolve(__dirname, 'LICENSE.md'),
  //     'Vite core license',
  //     'Vite',
  //   ),
  //   writeTypesPlugin(),
  //   enableSourceMapsInWatchModePlugin(),
  //   externalizeDepsInWatchPlugin(),
  // ],
})

// Resolve @vrowser/rolldown dist paths for WASM/Worker file copying
const rolldownPkgDir = path.dirname(fileURLToPath(import.meta.resolve('@vrowser/rolldown/package.json')))
const rolldownDistDir = path.resolve(rolldownPkgDir, 'dist')

const webWorkerConfig = defineConfig({
  ...sharedNodeOptions,
  output: {
    ...sharedNodeOptions.output,
    // Use separate chunk directory to avoid conflicting with nodeConfig's chunks
    chunkFileNames: 'node/worker-chunks/[name]-[hash].js',
  },
  input: {
    transformer: path.resolve(__dirname, 'src/node/transformer.ts'),
  },
  resolve: {
    alias: {
      'node:events': '@vrowser/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream/lib/stream',
      'node:buffer': 'buffer',
      'node:fs': '@vrowser/fs',
      'node:fs/promises': '@vrowser/fs/promises',
      'node:url': '@vrowser/node-polyfill/url',
      'node:util': '@vrowser/node-polyfill/util',
      'node:readline': '@vrowser/node-polyfill/readline',
      'node:perf_hooks': '@vrowser/node-polyfill/perf_hooks',
      events: '@vrowser/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream/lib/stream',
      buffer: 'buffer',
      fs: '@vrowser/fs',
      'fs/promises': '@vrowser/fs/promises',
      url: '@vrowser/node-polyfill/url',
      util: '@vrowser/node-polyfill/util',
      'readline': '@vrowser/node-polyfill/readline',
      'perf_hooks': '@vrowser/node-polyfill/perf_hooks',
      // NOTE(kazupon):
      // required('process/`) at `readable-stream/lib/internal/streams/pipeline.js:3:25` ...
      'process/': '@vrowser/node-polyfill/process',
      process: '@vrowser/node-polyfill/process',
    }
  },
  transform: {
    ...sharedNodeOptions.transform,
    // Inject `process` global for browser/Worker environments.
    // The resolve.alias above handles `import process from 'process'`,
    // but bare `process.stdout`, `process.env` references in the code
    // need the global to be shimmed via inject.
    inject: {
      process: '@vrowser/node-polyfill/process',
    },
  },
  plugins: [
    // Rewrite rolldown WASM/Worker URLs for transformer.js output location.
    // @vrowser/rolldown's build outputs URLs relative to chunks/ (e.g. ../rolldown-binding.wasm32-wasi.wasm),
    // but transformer.js is output directly to dist/node/ (no chunks), so URLs must be rewritten to ./
    {
      name: 'rewrite-rolldown-urls',
      renderChunk(code) {
        const replaced = code
          .replace(
            /new URL\(["']\.\.\/rolldown-binding\.wasm32-wasi\.wasm["'],\s*["']?["']?\s*\+?\s*import\.meta\.url\)/g,
            `new URL('./rolldown-binding.wasm32-wasi.wasm', '' + import.meta.url)`
          )
          .replace(
            /new URL\(["']\.\.\/worker\.js["'],\s*["']?["']?\s*\+?\s*import\.meta\.url\)/g,
            `new URL('./rolldown-worker.js', '' + import.meta.url)`
          )
        if (replaced === code) { return null }
        return { code: replaced }
      }
    },
    // Copy rolldown WASM binary and sub-worker to dist/node/
    {
      name: 'copy-rolldown-assets',
      writeBundle() {
        const destDir = path.resolve(__dirname, 'dist/node')
        // Copy WASM binary
        const wasmSrc = path.resolve(rolldownDistDir, 'rolldown-binding.wasm32-wasi.wasm')
        if (existsSync(wasmSrc)) {
          copyFileSync(wasmSrc, path.resolve(destDir, 'rolldown-binding.wasm32-wasi.wasm'))
        }
        // Copy sub-worker (renamed to avoid conflict with worker.js entry)
        const workerSrc = path.resolve(rolldownDistDir, 'worker.js')
        if (existsSync(workerSrc)) {
          copyFileSync(workerSrc, path.resolve(destDir, 'rolldown-worker.js'))
        }
      }
    }
  ],
})

const serviceWorkerConfig = defineConfig({
  ...sharedNodeOptions,
  output: {
    ...sharedNodeOptions.output,
    // Use separate chunk directory to avoid conflicting with nodeConfig's and webWorkerConfig's chunks
    chunkFileNames: 'node/sw-chunks/[name]-[hash].js',
  },
  input: {
    'service-worker': path.resolve(__dirname, 'src/node/service-worker.ts'),
  },
  plugins: [
    // Stub out modules that contain WASM or heavy dependencies not needed in SW.
    // These modules are only used by DevEnvironment (Web Worker side).
    // In SW, pluginContainer.ts is included transitively but its WASM-dependent
    // code paths (parseAst, es-module-lexer) are never executed.
    {
      name: 'stub-sw-unused-modules',
      resolveId: {
        filter: { id: /^es-module-lexer$|^@vrowser\/rolldown\/parseAst$|^@vrowser\/rolldown\/experimental$/ },
        handler(id) {
          return { id: `\0stub:${id}`, external: false }
        }
      },
      load: {
        filter: { id: /^\0stub:/ },
        handler(id) {
          // es-module-lexer exports init() and parse()
          if (id.includes('es-module-lexer')) {
            return {
              code: 'export const init = () => Promise.resolve(); export const parse = () => [[], [], false, false];',
              moduleType: 'js'
            }
          }
          // @vrowser/rolldown/parseAst exports parseAst() and parseAstAsync()
          if (id.includes('parseAst')) {
            return {
              code: 'export const parseAst = () => { throw new Error("parseAst is not available in Service Worker") }; export const parseAstAsync = parseAst;',
              moduleType: 'js'
            }
          }
          // @vrowser/rolldown/experimental exports transformSync, viteTransformPlugin, etc.
          if (id.includes('experimental')) {
            return {
              code: 'export const transformSync = () => { throw new Error("transformSync is not available in Service Worker") }; export const viteTransformPlugin = () => ({ name: "stub" });',
              moduleType: 'js'
            }
          }
          return { code: 'export {}', moduleType: 'js' }
        }
      }
    },
  ],
})

const moduleRunnerConfig = defineConfig({
  ...sharedNodeOptions,
  input: {
    'module-runner': path.resolve(__dirname, 'src/module-runner/index.ts')
  }
  // external: [
  //   'fsevents',
  //   'lightningcss',
  //   /^rolldown\//,
  //   ...Object.keys(pkg.dependencies),
  // ],
  // plugins: [bundleSizeLimit(54), enableSourceMapsInWatchModePlugin()],
  // output: {
  //   ...sharedNodeOptions.output,
  //   minify: {
  //     compress: true,
  //     mangle: false,
  //     codegen: false,
  //   },
  // },
})

// Lightweight Web Worker entry — does NOT bundle ./worker (transformer).
// Dynamic import('./worker') at runtime resolves to the webWorkerConfig output (dist/node/worker.js).
// Lightweight Web Worker entry — does NOT bundle ./transformer (rolldown/WASM).
// Dynamic import('./transformer') at runtime resolves to the webWorkerConfig output.
// NOTE: needs node:path alias because utils.ts (imported for createDebugger) uses node:path.
const webWorkerEntryConfig = defineConfig({
  ...sharedNodeOptions,
  resolve: {
    ...sharedNodeOptions.resolve,
    alias: {
      ...sharedNodeOptions.resolve?.alias,
      'node:path': 'pathe',
      path: 'pathe',
    }
  },
  input: {
    'web-worker': path.resolve(__dirname, 'src/node/web-worker.ts'),
  },
  // Mark ./transformer as external so it's not bundled into web-worker.js.
  external: [
    /^\.\/transformer$/,
  ],
  plugins: [
    // Fix external import path: rolldown resolves `./transformer` relative to source dir,
    // but the output `dist/node/web-worker.js` needs `./transformer.js` (same directory).
    {
      name: 'fix-transformer-import-path',
      renderChunk(code) {
        const replaced = code.replace(
          /await import\(["']\.\.\/transformer["']\)/g,
          'await import("./transformer.js")'
        )
        if (replaced === code) {return null}
        return { code: replaced }
      }
    }
  ],
})

export default defineConfig([envConfig, clientConfig, nodeConfig, serviceWorkerConfig, webWorkerConfig, webWorkerEntryConfig, moduleRunnerConfig])

// #region Plugins

// TODO(kazupon): if we need these plugins, we should bring codes from `refers/vite/packages/vite/rolldown.config.ts`

// #endregion
