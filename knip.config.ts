import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    'packages/fs': {
      entry: ['e2e/**'],
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
      entry: ['fixture/**'],
      ignoreDependencies: [
        '@rollup/plugin-yaml' // Used in vrowser.config.ts (loaded into Worker via @vrowser/vite-plugin)
      ]
    },
    'packages/rolldown': {
      entry: ['src/index.ts', 'e2e/**'],
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
      entry: ['src/**/*.ts', 'e2e/**', 'test-public/**', 'playground/**']
    },
    'packages/service-worker-server': {
      entry: ['e2e/**', 'test-public/**', 'docs/**']
    },
    'packages/unplugin-service-worker': {
      entry: ['src/**/*.ts', 'e2e/**']
    },
    'packages/vite-plugin': {
      // TODO(kazupon): These dependencies are used for bundling, but these might be unnecessary in 'dependecies'
      ignoreDependencies: [
        '@vrowser/fs',
        '@vrowser/node-polyfill',
        'buffer',
        'pathe',
        'readable-stream'
      ],
      // generateServiceWorkerEntry is kept for future SW plugin injection re-enablement
      ignore: ['src/virtual.ts']
    },
    // TODO(kazupon): enable after fnished to port from 'vite'
    // 'packages/vite-dev-server': {
    // }
    'packages/vrowser': {
      entry: ['e2e/**']
    }
  },
  ignore: [
    '.git/**',
    '**/.output*/**',
    '**/dist/**',
    'refers/**',
    '**/*.config.{js,ts}',
    // ignores for vite-dev-server package, because it will be forked from `vite` and maintained separately, preventing conflicts.
    'packages/vite-dev-server/**'
  ],
  ignoreBinaries: [
    'wrangler' // Used in play-vrowser scripts, installed as devDependency in play-vrowser
  ],
  ignoreDependencies: ['lint-staged', '@kazupon/prettier-config', '@kazupon/eslint-plugin'],
  exclude: [
    'duplicates' // EventEmitter exports both named and default for Node.js CJS/ESM compat
  ]
}

export default config
