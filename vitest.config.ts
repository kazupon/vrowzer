import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        publicDir: 'packages/service-worker/test-public',
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
      }
    ]
  }
})
