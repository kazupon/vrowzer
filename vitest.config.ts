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
          name: 'service-worker:e2e',
          include: ['./packages/service-worker/e2e/**/*.e2e-test.ts'],
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
          name: 'service-worker-server:e2e',
          include: ['./packages/service-worker-server/e2e/**/*.e2e-test.ts'],
          testTimeout: 30000,
          hookTimeout: 120000
        }
      },
      {
        test: {
          name: 'unplugin-service-worker:e2e',
          include: ['./packages/unplugin-service-worker/e2e/**/*.e2e-test.ts'],
          // bun.e2e-test.ts is a spawn wrapper that runs bun test for bun.e2e_test.ts
          testTimeout: 60000, // Extended for Bun test spawn
          hookTimeout: 120000
        }
      },
      {
        extends: './packages/vite-dev-server/vitest.config.ts',
        test: {
          name: 'vite-dev-server:unit',
          include: [
            './packages/vite-dev-server/src/**/*.browser-test.ts',
            './packages/vite-dev-server/src/**/*.test.ts'
          ],
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
      }
    ]
  }
})
