import type { KnipConfig } from 'knip'

export default {
  workspaces: {
    'packages/playground': {
      entry: ['src/main.ts', 'src/preview/*.ts', 'src/worker/*.ts']
    }
  },
  ignore: ['vite/**'],
  ignoreDependencies: ['lint-staged', '@kazupon/prettier-config']
} satisfies KnipConfig
