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
    }
  },
  ignore: ['refers/**', 'packages/vrowser/**', 'packages/memfs-test/**'],
  ignoreDependencies: ['lint-staged', '@kazupon/prettier-config', '@kazupon/eslint-plugin']
} satisfies KnipConfig
