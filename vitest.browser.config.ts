import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  publicDir: 'test-public', // for servie worker and web worker colocation
  test: {
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
})
