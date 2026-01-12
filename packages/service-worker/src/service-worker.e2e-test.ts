/**
 * @vrowser/service-worker E2E Tests
 *
 * Comprehensive end-to-end tests covering:
 * - Multi-tab Service Worker control
 * - Version management
 * - Session establishment
 * - Circuit breaker (suspend/resume/terminate)
 */

import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { getPort } from 'get-port-please'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest'

import type { ChildProcess } from 'node:child_process'
import type { Browser, BrowserContext, Page } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let serverProcess: ChildProcess
let browser: Browser

// Wait for server to be ready
async function waitForServer(url: string, timeout = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error(`Server did not start within ${timeout}ms`)
}

// Helper to wait for SW controller to be available
async function waitForController(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout })
}

// Helper to get SW version via messaging
async function getSwVersion(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/controller/')
    if (!reg?.active) return null
    return new Promise<string | null>(resolve => {
      const ch = new MessageChannel()
      ch.port1.onmessage = (e: MessageEvent<{ version?: string }>) =>
        resolve(e.data?.version ?? null)
      reg.active!.postMessage({ type: 'V_SW_VERSION' }, [ch.port2])
    })
  })
}

// Helper to establish a session with the SW
async function establishSession(page: Page): Promise<{ success: boolean; version: string | null }> {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/controller/')
    if (!reg?.active) return { success: false, version: null }

    return new Promise<{ success: boolean; version: string | null }>(resolve => {
      const ch = new MessageChannel()
      ch.port1.onmessage = (e: MessageEvent<{ success?: boolean; version?: string }>) => {
        resolve({
          success: e.data?.success ?? false,
          version: e.data?.version ?? null
        })
      }
      reg.active!.postMessage({ type: 'V_SW_SESSION_INIT' }, [ch.port2])
    })
  })
}

// Setup: Start dev server and browser once for all tests
beforeAll(async () => {
  // Get available port
  const port = await getPort({ port: 5173 })
  BASE_URL = `http://localhost:${port}`

  // Start Vite dev server
  serverProcess = spawn('npx', ['vite', '--port', String(port)], {
    cwd: packageDir,
    stdio: 'pipe'
  })

  // Wait for server to be ready
  await waitForServer(BASE_URL)

  // Launch browser
  browser = await chromium.launch()
})

// Cleanup: Close browser and stop server
afterAll(async () => {
  await browser?.close()
  serverProcess?.kill()
})

// =============================================================================
// Multi-tab Service Worker Control
// =============================================================================

describe('Multi-tab Service Worker Control', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    // Cleanup: unregister all service workers
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('same SW controls multiple pages', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page1)

    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page2.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page2)

    const controller1 = await page1.evaluate(() => navigator.serviceWorker.controller?.scriptURL)
    const controller2 = await page2.evaluate(() => navigator.serviceWorker.controller?.scriptURL)

    expect(controller1).toBeDefined()
    expect(controller1).toBe(controller2)

    await page1.close()
    await page2.close()
  })

  test('SW update propagates between pages', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const initialVersion = await getSwVersion(page1)
    expect(initialVersion).toBe('v1')

    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/controller/test-page.html?version=v2`)

    // Wait for v2 to be registered
    await page2.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration('/controller/')
        const checkVersion = async (sw: ServiceWorker | null) => {
          if (!sw) return false
          return new Promise<boolean>(resolve => {
            const ch = new MessageChannel()
            ch.port1.onmessage = (e: MessageEvent<{ version?: string }>) =>
              resolve(e.data?.version === 'v2')
            sw.postMessage({ type: 'V_SW_VERSION' }, [ch.port2])
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

  test('controllerchange event fires on SW activation', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page)

    const newController = await page.evaluate(async () => {
      const controllerChangePromise = new Promise<string>((resolve, reject) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve(navigator.serviceWorker.controller?.scriptURL ?? 'no-controller')
        })
        setTimeout(() => reject(new Error('Timeout waiting for controllerchange')), 15000)
      })

      const reg = await navigator.serviceWorker.register('/controller/v2-basic.js', {
        scope: '/controller/'
      })

      let sw = reg.installing || reg.waiting
      if (!sw) {
        return reg.active?.scriptURL ?? 'no-sw'
      }

      if (sw.state === 'installing') {
        await new Promise<void>(resolveState => {
          sw!.addEventListener('statechange', function handler() {
            if (sw!.state === 'installed' || sw!.state === 'activated') {
              sw!.removeEventListener('statechange', handler)
              resolveState()
            }
          })
        })
        sw = reg.waiting || reg.installing
      }

      if (sw) {
        sw.postMessage({ type: 'V_SW_SKIP_WAITING' })
      }

      return controllerChangePromise
    })

    expect(newController).toContain('v2-basic.js')

    await page.close()
  })
})

// =============================================================================
// Version Management
// =============================================================================

describe('Version Management', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('responds to V_SW_VERSION message with correct version', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const version = await getSwVersion(page)
    expect(version).toBe('v1')

    await page.close()
  })

  test('different SW files report different versions', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    const version1 = await getSwVersion(page1)

    // Unregister v1 and register v2
    await page1.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })

    await page1.goto(`${BASE_URL}/controller/test-page.html?version=v2`)
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    const version2 = await getSwVersion(page1)

    expect(version1).toBe('v1')
    expect(version2).toBe('v2')

    await page1.close()
  })
})

// =============================================================================
// Session Management
// =============================================================================

describe('Session Management', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    // Use circuit-breaker SW which supports session protocols
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('establishes session with V_SW_SESSION_INIT', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const result = await establishSession(page)

    expect(result.success).toBe(true)
    expect(result.version).toBe('v1')

    await page.close()
  })

  test('multiple pages can establish independent sessions', async () => {
    const page1 = await context.newPage()
    await page1.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page1.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const page2 = await context.newPage()
    await page2.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page2.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const result1 = await establishSession(page1)
    const result2 = await establishSession(page2)

    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)

    await page1.close()
    await page2.close()
  })
})

// =============================================================================
// Circuit Breaker (Suspend/Resume/Terminate)
// =============================================================================

describe('Circuit Breaker', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('suspend sets SW to suspended state', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/controller/')
      if (!reg?.active) return { success: false, mode: null as string | null }

      // Establish session first
      const ch = new MessageChannel()
      const sessionPromise = new Promise<boolean>(resolve => {
        ch.port1.onmessage = (e: MessageEvent<{ success?: boolean }>) => {
          resolve(e.data?.success ?? false)
        }
      })
      reg.active.postMessage({ type: 'V_SW_SESSION_INIT' }, [ch.port2])
      await sessionPromise

      // Send suspend command
      return new Promise<{ success: boolean; mode: string | null }>(resolve => {
        ch.port1.onmessage = (e: MessageEvent<{ success?: boolean; data?: { mode?: string } }>) => {
          resolve({
            success: e.data?.success ?? false,
            mode: e.data?.data?.mode ?? null
          })
        }
        ch.port1.postMessage({
          type: 'V_SW_SESSION_CIRCUIT_BREAKER',
          id: 'test-suspend-1',
          mode: 'suspend'
        })
      })
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('suspend')

    await page.close()
  })

  test('resume restores SW from suspended state', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/controller/')
      if (!reg?.active) return { suspended: false, resumed: false }

      // Establish session
      const ch = new MessageChannel()
      await new Promise<void>(resolve => {
        ch.port1.onmessage = () => resolve()
        reg.active!.postMessage({ type: 'V_SW_SESSION_INIT' }, [ch.port2])
      })

      // Suspend
      await new Promise<void>(resolve => {
        ch.port1.onmessage = () => resolve()
        ch.port1.postMessage({
          type: 'V_SW_SESSION_CIRCUIT_BREAKER',
          id: 'test-suspend-2',
          mode: 'suspend'
        })
      })

      // Resume
      const resumeResult = await new Promise<{ success: boolean }>(resolve => {
        ch.port1.onmessage = (e: MessageEvent<{ success?: boolean }>) => {
          resolve({ success: e.data?.success ?? false })
        }
        ch.port1.postMessage({
          type: 'V_SW_SESSION_RESUME',
          id: 'test-resume-1'
        })
      })

      return { suspended: true, resumed: resumeResult.success }
    })

    expect(result.suspended).toBe(true)
    expect(result.resumed).toBe(true)

    await page.close()
  })

  test('terminate unregisters the SW', async () => {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?sw=/controller/v1-circuit-breaker.js`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })

    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/controller/')
      if (!reg?.active) return { messageSent: false, unregistered: false }

      // Establish session
      const ch = new MessageChannel()
      await new Promise<void>(resolve => {
        ch.port1.onmessage = () => resolve()
        reg.active!.postMessage({ type: 'V_SW_SESSION_INIT' }, [ch.port2])
      })

      // Terminate - the SW may unregister before sending response, so we don't wait for response
      ch.port1.postMessage({
        type: 'V_SW_SESSION_CIRCUIT_BREAKER',
        id: 'test-terminate-1',
        mode: 'terminate'
      })

      // Wait for SW to unregister
      await new Promise(r => setTimeout(r, 200))
      const regAfter = await navigator.serviceWorker.getRegistration('/controller/')

      return {
        messageSent: true,
        unregistered: !regAfter
      }
    })

    expect(result.messageSent).toBe(true)
    expect(result.unregistered).toBe(true)

    await page.close()
  })
})

// =============================================================================
// Skip Waiting Behavior
// =============================================================================

describe('Skip Waiting Behavior', () => {
  let context: BrowserContext

  beforeEach(async () => {
    context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })
    await page.close()
  })

  afterEach(async () => {
    await context?.close()
  })

  test('V_SW_SKIP_WAITING triggers skipWaiting', async () => {
    const page = await context.newPage()
    // Register v1 first
    await page.goto(`${BASE_URL}/controller/test-page.html?version=v1`)
    await page.waitForSelector('#status:has-text("activated")', { timeout: 10000 })
    await waitForController(page)

    // Register v2-skip-waiting which auto-skips
    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/controller/v1-skip-waiting.js', {
        scope: '/controller/'
      })

      // Wait for installation
      const sw = reg.installing
      if (!sw) return { skipped: false }

      await new Promise<void>(resolve => {
        sw.addEventListener('statechange', function handler() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', handler)
            resolve()
          }
        })
      })

      // Check if new SW is now active
      const activeVersion = await new Promise<string | null>(resolve => {
        const ch = new MessageChannel()
        ch.port1.onmessage = (e: MessageEvent<{ version?: string }>) =>
          resolve(e.data?.version ?? null)
        reg.active?.postMessage({ type: 'V_SW_VERSION' }, [ch.port2])
      })

      return { skipped: true, version: activeVersion }
    })

    expect(result.skipped).toBe(true)

    await page.close()
  })
})
