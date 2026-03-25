import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createSvcWorkerController } from '@vrowzer/service-worker/controller'
import type { SvcWorkerController } from '@vrowzer/service-worker/controller'

// Clean up all service worker registrations
async function cleanupServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(r => r.unregister()))
}

// Send message to service worker and wait for response
async function sendMessage(sw: ServiceWorker, message: unknown): Promise<any> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => resolve(event.data)
    sw.postMessage(message, [channel.port2])
  })
}

// Wait for SW's Vite dev server to finish initialization (listen() completion)
async function waitForServerReady(controller: SvcWorkerController, timeout = 10000): Promise<void> {
  await controller.ready()
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Before rejecting, try to get server status for debugging
      const sw = controller.serviceWorker
      if (sw) {
        sendMessage(sw, { type: 'GET_SERVER_STATUS' }).then(status => {
          console.error('[waitForServerReady] timeout - server status:', status)
        }).catch(() => {})
      }
      reject(new Error('Server listen timeout'))
    }, timeout)
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'V_SW_LISTEN_READY') {
        clearTimeout(timer)
        navigator.serviceWorker.removeEventListener('message', handler)
        resolve()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    controller.serviceWorker?.postMessage({ type: 'V_SW_LISTEN_READY_PING' })
  })
}

// Track controller for cleanup
let currentController: SvcWorkerController | null = null

describe('createServer', () => {
  beforeEach(async () => {
    await cleanupServiceWorkers()
  })

  afterEach(() => {
    // Dispose controller to clear singleton cache
    if (currentController) {
      currentController.dispose()
      currentController = null
    }
  })

  describe('basic behavior', () => {
    test('createServer should correctly create ViteDevServer', async () => {
      // NOTE: scriptURL must use new URL(..., import.meta.url) directly here
      // for unplugin-service-worker to detect and bundle the service worker
      // Use absolute path since publicDir is set to test-public in vitest.config.ts
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      // Check server status via message
      const status = await sendMessage(sw!, { type: 'GET_SERVER_STATUS' })
      expect(status.hasServer).toBe(true)
      expect(status.hasMiddlewares).toBe(true)
      expect(status.hasHttpServer).toBe(true)
    })

    test('server.middlewares should be a Hono app instance', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      const status = await sendMessage(sw!, { type: 'GET_SERVER_STATUS' })
      expect(status.hasMiddlewares).toBe(true)
    })

    test('server.httpServer should be a SvcWorkerServer instance', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      const status = await sendMessage(sw!, { type: 'GET_SERVER_STATUS' })
      expect(status.hasHttpServer).toBe(true)
    })
  })

  describe('server.listen() behavior', () => {
    test('server.listen() should set up Service Worker fetch event handler', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      // After listen(), the SW should be able to handle fetch requests
      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      const status = await sendMessage(sw!, { type: 'GET_SERVER_STATUS' })
      expect(status.hasServer).toBe(true)
    })

    test('server.listen() should return ViteDevServer', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      // If we got here, listen() returned successfully in the SW
      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      const status = await sendMessage(sw!, { type: 'GET_SERVER_STATUS' })
      expect(status.hasServer).toBe(true)
    })
  })

  describe('built-in route behavior', () => {
    test('GET /hello should return correct response', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const response = await fetch('/hello')
      expect(response.ok).toBe(true)

      const text = await response.text()
      expect(text).toBe('Vite Dev Server on Service Worker says hello!')
    })

    test('fetch requests should be correctly handled via Hono', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const response = await fetch('/hello')
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
    })

    test('fetch requests from iframe should be intercepted by service worker', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      // Create an iframe and perform fetch from within it
      const iframe = document.createElement('iframe')
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head><title>Test iframe</title></head>
          <body>
            <script>
              window.addEventListener('message', async (event) => {
                if (event.data.type === 'FETCH_REQUEST') {
                  try {
                    const response = await fetch(event.data.url)
                    const text = await response.text()
                    parent.postMessage({
                      type: 'FETCH_RESPONSE',
                      ok: response.ok,
                      status: response.status,
                      text: text
                    }, '*')
                  } catch (error) {
                    parent.postMessage({
                      type: 'FETCH_RESPONSE',
                      error: error.message
                    }, '*')
                  }
                }
              })
              // Signal that iframe is ready
              parent.postMessage({ type: 'IFRAME_READY' }, '*')
            </script>
          </body>
        </html>
      `
      document.body.appendChild(iframe)

      try {
        // Wait for iframe to be ready
        await new Promise<void>((resolve) => {
          const handler = (event: MessageEvent) => {
            if (event.data.type === 'IFRAME_READY') {
              window.removeEventListener('message', handler)
              resolve()
            }
          }
          window.addEventListener('message', handler)
        })

        // Request fetch from iframe
        const fetchResult = await new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
          const handler = (event: MessageEvent) => {
            if (event.data.type === 'FETCH_RESPONSE') {
              window.removeEventListener('message', handler)
              if (event.data.error) {
                reject(new Error(event.data.error))
              } else {
                resolve(event.data)
              }
            }
          }
          window.addEventListener('message', handler)
          iframe.contentWindow!.postMessage({ type: 'FETCH_REQUEST', url: '/hello' }, '*')
        })

        expect(fetchResult.ok).toBe(true)
        expect(fetchResult.status).toBe(200)
        expect(fetchResult.text).toBe('Vite Dev Server on Service Worker says hello!')
      } finally {
        // Cleanup iframe
        document.body.removeChild(iframe)
      }
    })
  })

  describe('server.close() behavior', () => {
    test('server.close() should correctly stop the server', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      const result = await sendMessage(sw!, { type: 'CLOSE_SERVER' })
      expect(result.success).toBe(true)
    })

    test('calling close() multiple times should be safe', async () => {
      currentController = createSvcWorkerController({
        scriptURL: new URL('/test-sw.ts', import.meta.url),
        version: 'test-v1',
        scope: '/',
      })

      await waitForServerReady(currentController)

      const sw = currentController.serviceWorker
      expect(sw).not.toBeNull()

      // First close
      const result1 = await sendMessage(sw!, { type: 'CLOSE_SERVER' })
      expect(result1.success).toBe(true)

      // Second close - should still be safe (close is idempotent)
      const result2 = await sendMessage(sw!, { type: 'CLOSE_SERVER' })
      // server.close() is idempotent - returns same resolved promise
      expect(result2.success).toBe(true)
    })
  })
})
