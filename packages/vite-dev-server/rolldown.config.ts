// import { readFileSync, writeFileSync } from 'node:fs'
import { copyFileSync } from 'node:fs'
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
  plugins: [
    {
      name: 'copy-oxc-parser-wasm',
      writeBundle() {
        copyFileSync(
          path.resolve(__dirname, './node_modules/@vrowser/oxc-parser/dist/vrowser_oxc_parser_bg.wasm'),
          path.resolve(__dirname, './dist/node/vrowser_oxc_parser_bg.wasm')
        )
      }
    }
  ],
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

export default defineConfig([envConfig, clientConfig, nodeConfig, moduleRunnerConfig])

// #region Plugins

// TODO(kazupon): if we need these plugins, we should bring codes from `refers/vite/packages/vite/rolldown.config.ts`

// #endregion
