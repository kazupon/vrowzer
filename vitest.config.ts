import { resolve } from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: './packages/service-worker/vitest.config.ts',
        test: {
          name: 'service-worker:unit',
          include: ['./packages/service-worker/src/**/*.browser-test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000,
          // Run test files sequentially to avoid SW registration conflicts across files
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
          // bun.integration-test.ts is a spawn wrapper that runs bun test for bun.e2e_test.ts
          testTimeout: 60000, // Extended for Bun test spawn
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
      // TODO(kazupon): SW-based browser tests are flaky. Plan repo-level E2E tests via play-vrowzer instead.
      // {
      //   extends: './packages/vite-dev-server/vitest.config.ts',
      //   test: {
      //     name: 'vite-dev-server:unit:browser',
      //     include: ['./packages/vite-dev-server/src/**/*.browser-test.ts'],
      //     browser: {
      //       enabled: true,
      //       headless: true,
      //       provider: playwright(),
      //       instances: [
      //         {
      //           browser: 'chromium'
      //         }
      //       ]
      //     }
      //   }
      // },
      {
        extends: './packages/fs/vitest.config.ts',
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
        extends: './packages/vite-plugin/vitest.config.ts',
        test: {
          name: 'vite-plugin:unit',
          include: ['./packages/vite-plugin/src/**/*.test.ts']
        }
      },
      {
        extends: './packages/vrowzer/vitest.config.ts',
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
          hookTimeout: 120000
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
