import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        publicDir: 'packages/service-worker/test-public', // for servie worker and web worker colocation
        test: {
          name: 'service-worker',
          include: ['./packages/**/*.browser-test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            // https://vitest.dev/guide/browser/playwright
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
