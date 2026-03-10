import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    'packages/fs': {
      entry: ['integration/**'],
      ignoreDependencies: [
        // TODO(kazupon): These dependencies are used for bundling, but these might be unnecessary in 'dependecies'
        '@jsonjoy.com/fs-core',
        '@jsonjoy.com/fs-node',
        '@jsonjoy.com/fs-node-utils',
        // Used for bundling via resolve.alias (node polyfills)
        'pathe',
        '@vrowser/node-polyfill',
        'buffer',
        'premove',
        'readable-stream'
      ]
    },
    'packages/node-polyfill': {
      entry: ['src/**/*.ts'],
      ignore: [
        // Test helpers ported from Node.js — exports are used by individual test files on demand
        'integration/readable-stream/common/**'
      ],
      ignoreDependencies: [
        'premove' // Used by clean script
      ]
    },
    'packages/play-vrowser': {
      ignoreDependencies: [
        'vue/compiler-sfc' // Imported in vite.config.ts for Worker plugin override (not detected by knip)
      ]
    },
    'packages/rolldown': {
      entry: ['src/index.ts', 'integration/**'],
      ignoreDependencies: [
        // Used for bundling via resolve.alias (node polyfills)
        '@vrowser/node-polyfill',
        '@vrowser/service-worker',
        '@vrowser/unplugin-service-worker',
        'buffer',
        'pathe',
        'readable-stream'
      ]
    },
    'packages/service-worker': {
      entry: ['src/**/*.ts', 'integration/**', 'test-public/**', 'playground/**']
    },
    'packages/service-worker-server': {
      entry: ['integration/**', 'test-public/**', 'docs/**']
    },
    'packages/unplugin-service-worker': {
      entry: ['src/**/*.ts', 'integration/**']
    },
    'packages/vite-plugin': {
      // TODO(kazupon): These dependencies are used for bundling, but these might be unnecessary in 'dependecies'
      ignoreDependencies: [
        '@vrowser/fs',
        '@vrowser/node-polyfill',
        'buffer',
        'pathe',
        'readable-stream',
        'rolldown' // Used at runtime for parseSync (extract.ts) and prebundling (prebundle.ts)
      ],
      // generateServiceWorkerEntry is kept for future SW plugin injection re-enablement
      ignore: ['src/virtual.ts']
    },
    // TODO(kazupon): enable after fnished to port from 'vite'
    // 'packages/vite-dev-server': {
    // }
    'packages/vrowser': {
      entry: ['integration/**']
    }
  },
  ignore: [
    '.git/**',
    '**/.output*/**',
    '**/dist/**',
    'refers/**',
    '**/*.config.{js,ts}',
    // ignores for vite-dev-server package, because it will be forked from `vite` and maintained separately, preventing conflicts.
    'packages/vite-dev-server/**',
    // Bundled vendor files and E2E test fixtures
    'e2e/fixtures/**',
    'e2e/hosts/**',
    'e2e/helpers/**'
  ],
  ignoreBinaries: [
    'wrangler' // Used in play-vrowser scripts, installed as devDependency in play-vrowser
  ],
  ignoreDependencies: [
    'lint-staged',
    '@kazupon/prettier-config',
    '@kazupon/eslint-plugin',
    '@playwright/test'
  ],
  exclude: [
    'duplicates' // EventEmitter exports both named and default for Node.js CJS/ESM compat
  ]
}

export default config
