import { expect, test } from '@playwright/test'

// Helper to wait for SW controller to be available
async function waitForController(
  page: import('@playwright/test').Page,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout })
}

test.describe('Multi-tab Service Worker Control', () => {
  test.beforeEach(async ({ page }) => {
    // Cleanup: unregister all service workers before each test
    await page.goto('/controller/test-page.html?version=v1')
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
  })

  test('same SW controls multiple pages', async ({ browser }) => {
    // Open first page and register SW
    const page1 = await browser.newPage()
    await page1.goto('/controller/test-page.html?version=v1')
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page1)

    // Open second page in same scope
    const page2 = await browser.newPage()
    await page2.goto('/controller/test-page.html?version=v1')
    await page2.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page2)

    // Get controller info from both pages
    const controller1 = await page1.evaluate(() => navigator.serviceWorker.controller?.scriptURL)
    const controller2 = await page2.evaluate(() => navigator.serviceWorker.controller?.scriptURL)

    // Both pages should have the same controller
    expect(controller1).toBeDefined()
    expect(controller1).toBe(controller2)

    await page1.close()
    await page2.close()
  })

  test('SW update propagates between pages', async ({ browser }) => {
    // Open first page with v1 SW
    const page1 = await browser.newPage()
    await page1.goto('/controller/test-page.html?version=v1')
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    // Get initial version
    const initialVersion = await page1.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/controller/')
      if (!reg?.active) return null
      return new Promise<string | null>(resolve => {
        const ch = new MessageChannel()
        ch.port1.onmessage = e => resolve(e.data?.version ?? null)
        reg.active!.postMessage({ type: 'VROWSER_SW_VERSION' }, [ch.port2])
      })
    })
    expect(initialVersion).toBe('v1')

    // Open second page with v2 SW (this will register a new SW)
    const page2 = await browser.newPage()
    await page2.goto('/controller/test-page.html?version=v2')

    // Wait for v2 to be registered
    await page2.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/controller/')
        // Check if v2 is in any slot
        const checkVersion = async (sw: ServiceWorker | null) => {
          if (!sw) return false
          return new Promise<boolean>(resolve => {
            const ch = new MessageChannel()
            ch.port1.onmessage = e => resolve(e.data?.version === 'v2')
            sw.postMessage({ type: 'VROWSER_SW_VERSION' }, [ch.port2])
          })
        }
        return (
          (await checkVersion(reg?.installing ?? null)) ||
          (await checkVersion(reg?.waiting ?? null)) ||
          (await checkVersion(reg?.active ?? null))
        )
      },
      { timeout: 10000 }
    )

    await page1.close()
    await page2.close()
  })

  test('controllerchange event fires on SW activation', async ({ browser }) => {
    // Open page with v1 SW
    const page = await browser.newPage()
    await page.goto('/controller/test-page.html?version=v1')
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page)

    // Register v2 SW with skipWaiting and wait for controllerchange
    const newController = await page.evaluate(async () => {
      return new Promise<string>(async (resolve, reject) => {
        // Set up listener for controllerchange
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve(navigator.serviceWorker.controller?.scriptURL ?? 'no-controller')
        })

        // Set timeout to reject if no controllerchange
        setTimeout(() => reject(new Error('Timeout waiting for controllerchange')), 15000)

        try {
          const reg = await navigator.serviceWorker.register('/controller/v2-basic.js', {
            scope: '/controller/'
          })

          // Wait for v2 to be installing or waiting
          let sw = reg.installing || reg.waiting
          if (!sw) {
            // Maybe already active
            resolve(reg.active?.scriptURL ?? 'no-sw')
            return
          }

          // Wait for the SW to be installed/waiting before sending skipWaiting
          if (sw.state === 'installing') {
            await new Promise<void>(resolveState => {
              sw!.addEventListener('statechange', function handler() {
                if (sw!.state === 'installed' || sw!.state === 'activated') {
                  sw!.removeEventListener('statechange', handler)
                  resolveState()
                }
              })
            })
            // Refresh sw reference
            sw = reg.waiting || reg.installing
          }

          // Send skipWaiting message
          if (sw) {
            sw.postMessage({ type: 'VROWSER_SW_SKIP_WAITING' })
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    expect(newController).toContain('v2-basic.js')

    await page.close()
  })
})
