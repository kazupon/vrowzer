// import { readFileSync, writeFileSync } from 'node:fs'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MagicString from 'magic-string'
import type { Plugin } from 'rolldown'
import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }
// import { init, parse } from 'es-module-lexer'
// import licensePlugin from './rollupLicensePlugin'

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
  transform: {
    define: {
      'process.platform': JSON.stringify('browser'), // for `tinyglobby` polyfill
      '__VROWSER_SERVICE_WORKER__': 'false', // default: not Service Worker (overridden in serviceWorkerConfig)
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
    // NOTE(kazupon): commented out, this entry isn't used for vrowser, but we keep to maintain the code structure for later use.
    // index: path.resolve(__dirname, 'src/node/index.ts'),
    cli: path.resolve(__dirname, 'src/node/cli.ts'),
    internal: path.resolve(__dirname, 'src/node/internalIndex.ts')
  },
  external: [
    // /^vite\//,
    // 'fsevents',
    // /^rolldown\//,
    // /^tsx\//,
    // /^#/,
    // 'sugarss', // postcss-import -> sugarss
    // 'supports-color',
    // 'utf-8-validate', // ws
    // 'bufferutil', // ws
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
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

/**
 * NOTE(kazupon):
 * The service-worker output contains unresolved `node:*` and prefix-less
 * Node.js built-in imports (fs, path, url, etc.). These are intentionally left
 * as external so that the consumer (facade package) can resolve them via
 * `resolve.alias` in their own bundler config. For example:
 *
 *   resolve: {
 *     alias: {
 *       'node:fs': '@vrowser/fs',
 *       'node:path': 'pathe',
 *       'fs': '@vrowser/fs',
 *       'path': 'pathe',
 *       // ... other polyfills
 *     }
 *   }
 *
 * This allows the consumer to choose the appropriate polyfills for their
 * target environment (Service Worker, Web Worker, browser, etc.).
 */
const serviceWorkerConfig = defineConfig({
  ...sharedNodeOptions,
  output: {
    ...sharedNodeOptions.output,
    // Use separate chunk directory to avoid conflicting with nodeConfig's and webWorkerConfig's chunks
    chunkFileNames: 'node/service-worker-chunks/[name]-[hash].js',
  },
  input: {
    'service-worker': path.resolve(__dirname, 'src/node/service-worker.ts'),
  },
  transform: {
    ...sharedNodeOptions.transform,
    define: {
      ...sharedNodeOptions.transform?.define,
      '__VROWSER_SERVICE_WORKER__': 'true',
    },
  },
  external: [
    /^node:/,
    // prefix-less node builtins used by dependencies (e.g. tinyglobby)
    'fs', 'path', 'url', 'util', 'os', 'crypto', 'stream', 'events', 'buffer', 'dns',
  ],
  plugins: [
    // NOTE: PostCSS shimDepsPlugin is NOT needed here because __VROWSER_SERVICE_WORKER__ DCE
    // eliminates css.ts and its postcss-load-config dependency from the SW bundle.
    // shimDepsPlugin for PostCSS is only in transformerConfig (WW bundle).

    // Stub out modules that contain WASM or heavy dependencies not needed in SW.
    // These modules are only used by DevEnvironment (Web Worker side).
    // In SW, pluginContainer.ts is included transitively but its WASM-dependent
    // code paths (parseAst, es-module-lexer) are never executed.
    {
      name: 'stub-sw-unused-modules',
      resolveId: {
        filter: { id: /^es-module-lexer$|^@vrowser\/rolldown$|^@vrowser\/rolldown\/parseAst$|^@vrowser\/rolldown\/experimental$/ },
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
          // @vrowser/rolldown main entry exports rolldown(), VERSION
          if (id.endsWith('stub:@vrowser/rolldown')) {
            return {
              code: 'export const rolldown = () => { throw new Error("rolldown is not available in Service Worker") }; export const VERSION = "stub";',
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
          // @vrowser/rolldown/experimental exports transformSync, viteTransformPlugin,
          // viteJsonPlugin, viteWasmFallbackPlugin, etc.
          // Stub all as noop/error — these are only used by DevEnvironment (Web Worker side).
          if (id.includes('experimental')) {
            return {
              code: [
                'const stubFn = () => { throw new Error("Not available in Service Worker") }',
                'const stubPlugin = (opts) => ({ name: "stub" })',
                'export const transformSync = stubFn',
                'export const viteTransformPlugin = stubPlugin',
                'export const viteJsonPlugin = stubPlugin',
                'export const viteWasmFallbackPlugin = stubPlugin',
                'export const viteAliasPlugin = stubPlugin',
              ].join('; '),
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
  },
  external: [
    /^node:/,
    // 'fsevents',
    // 'lightningcss',
    // /^rolldown\//,
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
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

// Resolve @vrowser/rolldown dist paths for WASM/Worker file copying
const rolldownPkgDir = path.dirname(fileURLToPath(import.meta.resolve('@vrowser/rolldown/package.json')))
const rolldownDistDir = path.resolve(rolldownPkgDir, 'dist')

const transformerConfig = defineConfig({
  ...sharedNodeOptions,
  output: {
    ...sharedNodeOptions.output,
    // Use separate chunk directory to avoid conflicting with nodeConfig's chunks
    chunkFileNames: 'node/transformer-chunks/[name]-[hash].js',
  },
  input: {
    transformer: path.resolve(__dirname, 'src/node/transformer.ts'),
    // Vite-compat API entry shares the same build pipeline and chunks as transformer.
    // This ensures rolldown WASM is loaded once (not duplicated in a separate vite-chunks dir).
    vite: path.resolve(__dirname, 'src/node/vite.ts'),
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
      'node:dns': '@vrowser/node-polyfill/dns',
      'node:os': '@vrowser/node-polyfill/os',
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
      os: '@vrowser/node-polyfill/os',
      crypto: '@vrowser/node-polyfill/crypto',
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
    // Stub postcss-load-config: vrowser doesn't load PostCSS config from filesystem.
    // Config is always provided inline. This eliminates jiti and node:module dependencies.
    {
      name: 'stub-postcss-load-config',
      resolveId: {
        filter: { id: /^postcss-load-config$/ },
        handler(id) {
          return { id: `\0stub:${id}`, external: false }
        }
      },
      load: {
        filter: { id: /^\0stub:postcss-load-config$/ },
        handler() {
          return {
            code: 'export default () => Promise.resolve({ plugins: [], options: {} })',
            moduleType: 'js'
          }
        }
      }
    },
    // Shim PostCSS dependencies that use Node.js-specific patterns
    // (ported from refers/vite/packages/vite/rolldown.config.ts)
    shimDepsPlugin({
      'postcss-import/index.js': [
        {
          src: 'const resolveId = require("./lib/resolve-id")',
          replacement: 'const resolveId = (id) => id',
        },
        {
          src: 'const loadContent = require("./lib/load-content")',
          replacement: 'const loadContent = () => ""',
        },
      ],
      'postcss-import/lib/parse-styles.js': [
        {
          src: 'const resolveId = require("./resolve-id")',
          replacement: 'const resolveId = (id) => id',
        },
      ],
    }),
    // Rewrite rolldown WASM/Worker URLs to always use './'.
    // @vrowser/rolldown's build outputs URLs relative to its chunks/ dir (e.g. ../rolldown-binding.wasm32-wasi.wasm).
    // We normalize these to './' and copy WASM/worker files alongside each chunk directory,
    // so the URLs work regardless of where the chunk ends up (including when re-bundled by consumers).
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
    // Copy rolldown WASM binary and sub-worker to all output directories.
    // Files are placed in both dist/node/ and dist/node/transformer-chunks/
    // so that './rolldown-binding.wasm32-wasi.wasm' resolves correctly
    // from any chunk location.
    {
      name: 'copy-rolldown-assets',
      writeBundle(_options, bundle) {
        const outputDirs = new Set<string>()
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            outputDirs.add(path.resolve(__dirname, 'dist', path.dirname(chunk.fileName)))
          }
        }
        const wasmSrc = path.resolve(rolldownDistDir, 'rolldown-binding.wasm32-wasi.wasm')
        const workerSrc = path.resolve(rolldownDistDir, 'worker.js')
        for (const dir of outputDirs) {
          if (existsSync(wasmSrc)) {
            copyFileSync(wasmSrc, path.resolve(dir, 'rolldown-binding.wasm32-wasi.wasm'))
          }
          if (existsSync(workerSrc)) {
            copyFileSync(workerSrc, path.resolve(dir, 'rolldown-worker.js'))
          }
        }
      }
    }
  ],
})

/**
 * NOTE(kazupon):
 * Lightweight Web Worker entry — does NOT bundle ./transformer (rolldown/WASM).
 * Dynamic import('./transformer') at runtime resolves to the transformerConfig output (dist/node/transformer.js).
 *
 * Like serviceWorkerConfig, the web-worker output contains unresolved `node:*`
 * and prefix-less Node.js built-in imports. The consumer (facade package) must
 * resolve them via `resolve.alias` in their own bundler config. For example:
 *
 *   resolve: {
 *     alias: {
 *       'node:fs': '@vrowser/fs',
 *       'node:path': 'pathe',
 *       'fs': '@vrowser/fs',
 *       'path': 'pathe',
 *       // ... other polyfills
 *     }
 *   }
 */
const webWorkerConfig = defineConfig({
  ...sharedNodeOptions,
  resolve: {
    ...sharedNodeOptions.resolve,
    alias: {
      ...sharedNodeOptions.resolve?.alias,
    }
  },
  input: {
    'web-worker': path.resolve(__dirname, 'src/node/web-worker.ts'),
  },
  // Mark ./transformer as external so it's not bundled into web-worker.js.
  // node:* and prefix-less builtins are resolved by the consumer (facade package).
  external: [
    /^\.\/transformer$/,
    /^node:/,
    'fs', 'path', 'url', 'util', 'os', 'crypto', 'stream', 'events', 'buffer', 'dns',
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
        if (replaced === code) { return null }
        return { code: replaced }
      }
    }
  ],
})

const messagesConfig = defineConfig({
  input: {
    messages: path.resolve(__dirname, 'src/shared/messages.ts'),
  },
  platform: 'neutral',
  output: {
    dir: path.resolve(__dirname, 'dist'),
    entryFileNames: 'shared/[name].js',
  },
})

export default defineConfig([
  envConfig,
  clientConfig,
  nodeConfig,
  serviceWorkerConfig,
  transformerConfig,
  webWorkerConfig,
  moduleRunnerConfig,
  messagesConfig,
])

// #region Plugins

// Ported from `refers/vite/packages/vite/rolldown.config.ts`
// Shim problematic dependencies that use Node.js-specific patterns
// (e.g. __filename, require()) which don't work in browser/Worker environments.
interface ShimOptions {
  src?: string
  replacement: string
  pattern?: RegExp
}

function shimDepsPlugin(deps: Record<string, ShimOptions[]>): Plugin {
  const transformed: Record<string, boolean> = {}

  return {
    name: 'shim-deps',
    transform: {
      filter: {
        id: new RegExp(`(?:${Object.keys(deps).join('|')})$`),
      },
      handler(code, id) {
        const file = Object.keys(deps).find((file) =>
          id.replace(/\\/g, '/').endsWith(file),
        )
        if (!file) {return}

        for (const { src, replacement, pattern } of deps[file]) {
          const magicString = new MagicString(code)

          if (src) {
            const pos = code.indexOf(src)
            if (pos < 0) {
              this.error(
                `Could not find expected src "${src}" in file "${file}"`,
              )
            }
            transformed[file] = true
            magicString.overwrite(pos, pos + src.length, replacement)
          }

          if (pattern) {
            let match
            while ((match = pattern.exec(code))) {
              transformed[file] = true
              const start = match.index
              const end = start + match[0].length
              let _replacement = replacement
              for (let i = 1; i <= match.length; i++) {
                _replacement = _replacement.replace(`$${i}`, match[i] || '')
              }
              magicString.overwrite(start, end, _replacement)
            }
            if (!transformed[file]) {
              this.error(
                `Could not find{return}ted pattern "${pattern}" in file "${file}"`,
              )
            }
          }

          code = magicString.toString()
        }

        return code
      },
    },
    buildEnd(err) {
      if (this.meta.watchMode) {return}

      if (!err) {
        for (const file in deps) {
          if (!transformed[file]) {
            this.error(
              `Did not find "${file}" which is supposed to be shimmed, was the file renamed?`,
            )
          }
        }
      }
    },
  }
}

// #endregion
