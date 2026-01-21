import type { KnipConfig } from 'knip'

export default {
  workspaces: {
    'packages/playground': {
      entry: ['src/main.ts', 'src/preview/*.ts', 'src/worker/*.ts']
    },
    'packages/service-worker': {
      entry: ['src/**/*.ts', 'e2e/**/*.ts'],
      ignore: ['test-public/**', 'playground/**']
    },
    'packages/unplugin-service-worker': {
      entry: ['src/**/*.ts', 'e2e/**/*.ts', 'e2e/**/*.js']
    },
    'packages/service-worker-server': {
      entry: ['src/**/*.ts', 'e2e/**/*.ts'],
      ignore: ['test-public/**']
    }
  },
  ignore: [
    'refers/**',
    'packages/vrowser/**',
    'packages/memfs-test/**',
    // ignores for vite-dev-server package, because it will be forked from `vite` and maintained separately, preventing conflicts.
    'packages/vite-dev-server/**'
  ],
  ignoreDependencies: ['lint-staged', '@kazupon/prettier-config', '@kazupon/eslint-plugin']
} satisfies KnipConfig
