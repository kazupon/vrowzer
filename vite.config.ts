import { resolve } from 'node:path'
import {
  defineFmtConfig,
  defineLintConfig,
  defaultIgnoreFilesOfEnforceHeaderCommentRule
} from '@kazupon/vp-config'
import { defineConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

const commonIgnorePatterns = [
  '.playwright-cli',
  '.vscode/**/*.json',
  '.claude/**/*.md',
  '**/dist',
  '**/.output',
  '**/.output-shared',
  '**/.notes',
  '**/.diff',
  '**/*.html',
  '**/tsconfig*.json',
  '**/__screenshots__',
  'README.md',
  'TODO.md',
  'design/**/*.md',
  'e2e/fixtures/**',
  'packages/**/docs/**',
  'packages/*/README.md',
  'refers/**'
]

const fmtIgnorePatterns = [
  ...commonIgnorePatterns,
  'pnpm-lock.yaml',
  'package.json',
  'packages/vite-dev-server/**'
]

const lintIgnorePatterns = [
  ...commonIgnorePatterns,
  'packages/node-polyfill/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'packages/play-vrowzer/**'
]

const headerCommentIgnoreFiles = [
  ...defaultIgnoreFilesOfEnforceHeaderCommentRule,
  '**/*.browser-{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  '**/*.browser-{test,spec}-d.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  '**/*.integration-{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  '**/*.e2e-{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  '**/*.{test,spec}-d.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'scripts/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'packages/vite-dev-server/{src,types,misc}/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'packages/vite-dev-server/client.d.ts',
  'packages/{rolldown,service-worker,unplugin-service-worker,service-worker-server}/{playground,e2e,test-public}/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'examples/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'integration/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'e2e/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
]

export default defineConfig({
  staged: {
    '*': 'vp check --fix'
  },
  fmt: defineFmtConfig({
    ignorePatterns: fmtIgnorePatterns
  }),
  lint: defineLintConfig({
    ignorePatterns: lintIgnorePatterns,
    options: {
      typeAware: false,
      typeCheck: false
    },
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error'
    },
    typescript: {
      rules: {
        'typescript/consistent-type-imports': 'off'
      }
    },
    import: {
      rules: {
        'import/consistent-type-specifier-style': 'off'
      }
    },
    comments: {
      enForceHeaderComment: {
        ignoreFiles: headerCommentIgnoreFiles
      }
    },
    overrides: [
      {
        files: ['packages/vite-dev-server/**/*.{ts,mts,cts,tsx}'],
        rules: {
          'typescript/triple-slash-reference': 'off'
        }
      }
    ]
  }),
  test: {
    exclude: ['**/node_modules/**', '**/.git/**', 'refers/**'],
    projects: [
      {
        extends: './packages/service-worker/vite.config.ts',
        test: {
          name: 'service-worker:unit',
          include: ['./packages/service-worker/src/**/*.browser-test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000,
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium'
              }
            ]
          }
        }
      },
      {
        test: {
          name: 'service-worker:integration',
          include: ['./packages/service-worker/integration/**/*.integration-test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000
        }
      },
      {
        test: {
          name: 'unplugin-service-worker:unit',
          include: ['./packages/unplugin-service-worker/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'service-worker-server:unit',
          include: ['./packages/service-worker-server/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'service-worker-server:integration',
          include: ['./packages/service-worker-server/integration/**/*.integration-test.ts'],
          testTimeout: 30000,
          hookTimeout: 120000
        }
      },
      {
        test: {
          name: 'unplugin-service-worker:integration',
          include: ['./packages/unplugin-service-worker/integration/**/*.integration-test.ts'],
          exclude: ['./packages/unplugin-service-worker/integration/bun.integration-test.ts'],
          testTimeout: 60000,
          hookTimeout: 120000
        }
      },
      {
        test: {
          name: 'vite-dev-server:unit:node',
          environment: 'node',
          include: ['./packages/vite-dev-server/src/**/*.test.ts']
        }
      },
      {
        extends: './packages/fs/vite.config.ts',
        test: {
          name: 'fs:unit',
          include: ['./packages/fs/src/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'fs:integration',
          include: ['./packages/fs/integration/**/*.integration-test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000
        }
      },
      {
        test: {
          name: 'node-polyfill:unit',
          include: ['./packages/node-polyfill/src/**/*.browser-test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium'
              }
            ]
          }
        }
      },
      {
        resolve: {
          alias: {
            events: '@vrowzer/node-polyfill/events'
          }
        },
        test: {
          name: 'node-polyfill:integration',
          environment: 'node',
          include: ['./packages/node-polyfill/integration/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'rolldown:integration',
          include: ['./packages/rolldown/integration/**/*.integration-test.ts'],
          testTimeout: 60000,
          hookTimeout: 120000
        }
      },
      {
        extends: './packages/vite-plugin/vite.config.ts',
        test: {
          name: 'vite-plugin:unit',
          include: ['./packages/vite-plugin/src/**/*.test.ts']
        }
      },
      {
        extends: './packages/vrowzer/vite.config.ts',
        test: {
          name: 'vrowzer:unit',
          include: ['./packages/vrowzer/src/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'vrowzer:integration',
          include: ['./packages/vrowzer/integration/**/*.integration-test.ts'],
          testTimeout: 60000,
          hookTimeout: 120000,
          fileParallelism: false
        }
      },
      {
        test: {
          name: 'safe-port:unit',
          include: ['./packages/safe-port/src/**/*.browser-test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium'
              }
            ]
          }
        }
      },
      {
        test: {
          name: 'release:unit',
          environment: 'node',
          include: ['./scripts/**/*.test.ts']
        }
      },
      {
        resolve: {
          alias: {
            '~utils': resolve(import.meta.dirname, './e2e/test-utils')
          }
        },
        test: {
          name: 'vrowzer:e2e',
          include: ['./e2e/vite-*/*.spec.ts', './e2e/playground/**/*.spec.ts'],
          setupFiles: ['./e2e/vitestSetup.ts'],
          globalSetup: ['./e2e/globalSetup.ts'],
          testTimeout: 60000,
          hookTimeout: 120000,
          fileParallelism: false
        }
      }
    ]
  }
})
