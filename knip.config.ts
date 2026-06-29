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
        '@vrowzer/node-polyfill',
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
    'packages/play-vrowzer': {
      entry: ['src/**/*.ts', 'fixtures/**'],
      ignoreDependencies: [
        'vue/compiler-sfc' // Imported in vite.config.ts for Worker plugin override (not detected by knip)
      ]
    },
    'packages/rolldown': {
      entry: ['src/index.ts', 'src/utils.ts', 'integration/**'],
      ignoreDependencies: [
        // Used for bundling via resolve.alias (node polyfills)
        '@vrowzer/node-polyfill',
        '@vrowzer/service-worker',
        '@vrowzer/unplugin-service-worker',
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
    'packages/safe-port': {
      entry: ['src/**/*.ts']
    },
    'packages/unplugin-service-worker': {
      bun: false,
      entry: ['src/**/*.ts', 'integration/**']
    },
    'packages/vite-plugin': {
      // TODO(kazupon): These dependencies are used for bundling, but these might be unnecessary in 'dependecies'
      ignoreDependencies: [
        '@vrowzer/fs',
        '@vrowzer/node-polyfill',
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
    'packages/vrowzer': {
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
    'e2e/**'
  ],
  ignoreBinaries: [
    'wrangler' // Used in play-vrowzer scripts, installed as devDependency in play-vrowzer
  ],
  ignoreDependencies: [
    'lint-staged',
    '@kazupon/prettier-config',
    '@kazupon/eslint-plugin',
    '@playwright/test'
  ],
  ignoreIssues: {
    'packages/vite-plugin/src/extract.ts': ['types'],
    'packages/vite-plugin/src/options.ts': ['types'],
    'packages/vite-plugin/src/prebundle.ts': ['exports', 'types']
  },
  exclude: [
    'duplicates' // EventEmitter exports both named and default for Node.js CJS/ESM compat
  ]
}

export default config
