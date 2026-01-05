import type { KnipConfig } from 'knip'

export default {
  workspaces: {
    'packages/playground': {
      entry: ['src/main.ts', 'src/preview/*.ts', 'src/worker/*.ts']
    }
  },
  ignore: ['vite/**', 'oxc/**', 'rolldown/**', 'rs-napi/**'],
  ignoreDependencies: ['lint-staged', '@kazupon/prettier-config', '@kazupon/eslint-plugin']
} satisfies KnipConfig
