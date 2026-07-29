import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    'packages/fs': {
      entry: ['src/index.ts', 'src/promises.ts', 'src/watcher/index.ts', 'integration/**'],
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
        'publint',
        'readable-stream',
        'vite'
      ]
    },
    'packages/node-polyfill': {
      entry: ['src/**/*.ts'],
      ignore: [
        // Test helpers ported from Node.js — exports are used by individual test files on demand
        'integration/readable-stream/common/**'
      ],
      ignoreDependencies: [
        'premove', // Used by clean script
        'publint'
      ]
    },
    'packages/play-vrowzer': {
      entry: ['src/**/*.ts', 'fixtures/**']
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
    'packages/oxlint-plugin-service-worker': {
      entry: ['src/index.ts'],
      ignoreDependencies: ['publint']
    },
    'packages/service-worker': {
      entry: [
        'src/admin.ts',
        'src/controller.ts',
        'src/protocols.ts',
        'src/types.ts',
        'src/worker.ts',
        'src/**/*.browser-test.ts',
        'integration/**',
        'test-public/**',
        'playground/**'
      ],
      ignoreDependencies: ['publint', 'vite']
    },
    'packages/service-worker-server': {
      entry: ['src/index.ts', 'integration/**', 'test-public/**', 'docs/**'],
      ignoreDependencies: ['publint', 'vite']
    },
    'packages/safe-port': {
      entry: ['src/index.ts', 'src/**/*.browser-test.ts'],
      ignoreDependencies: ['publint']
    },
    'packages/unplugin-service-worker': {
      bun: false,
      entry: ['src/**/*.ts', 'integration/**']
    },
    'packages/vite-plugin': {
      entry: ['src/index.ts', 'src/manifest-generate.ts', 'src/ide/main.ts'],
      // TODO(kazupon): These dependencies are used for bundling, but these might be unnecessary in 'dependecies'
      ignoreDependencies: [
        '@vrowzer/fs',
        '@vrowzer/node-polyfill',
        'buffer',
        'pathe',
        'readable-stream',
        '@vitejs/plugin-vue'
      ]
    },
    // TODO(kazupon): enable after fnished to port from 'vite'
    // 'packages/vite-dev-server': {
    // }
    'packages/vrowzer': {
      entry: ['src/index.ts', 'integration/**']
    }
  },
  ignore: [
    '**/.output*/**',
    '**/dist/**',
    'refers/**',
    '**/*.config.{js,ts}',
    // ignores for vite-dev-server package, because it will be forked from `vite` and maintained separately, preventing conflicts.
    'packages/vite-dev-server/**',
    // Bundled vendor files and E2E test fixtures
    'e2e/**'
  ],
  ignoreIssues: {
    'packages/service-worker/src/session.ts': ['types'],
    'packages/service-worker/src/utils.ts': ['types'],
    'packages/vite-plugin/src/extract.ts': ['types'],
    'packages/vite-plugin/src/options.ts': ['types'],
    'packages/vite-plugin/src/prebundle.ts': ['exports', 'types']
  },
  exclude: [
    'duplicates' // EventEmitter exports both named and default for Node.js CJS/ESM compat
  ]
}

export default config
