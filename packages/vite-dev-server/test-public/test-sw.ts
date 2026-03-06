/// <reference lib="webworker" />
import { createServer } from '@vrowser/vite-dev-server/service-worker'
import type { ViteDevServerForServiceWorker as ViteDevServer } from '@vrowser/vite-dev-server/service-worker'

declare const self: ServiceWorkerGlobalScope

// Service Worker version - must match what the test controller expects
const SW_VERSION = 'test-v1'

// Create listen function synchronously - fetch event is registered immediately
// This MUST be at script top-level to register fetch handler during script evaluation
// The version option is passed to createSvcWorkerServer which handles controller protocol
const listen = createServer(
  self,
  {
    root: '/',
    server: {
      middlewareMode: false,
    },
  } as any,
  { version: SW_VERSION }
)

// Server instance will be set after listen()
let server: ViteDevServer | null = null

// Start the server at top level (same pattern as vrowser's service-worker-core.ts)
// This ensures the server is ready regardless of when activate fires
const listenPromise = listen()
let listenReady = false
listenPromise.then(s => {
  server = s
  listenReady = true
}).catch(err => {
  console.error('[test-sw] listen() failed:', err)
})

// Service Worker install
self.addEventListener('install', (_event) => {
  // Skip waiting to activate immediately
})

// Service Worker activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    listenPromise.then(async () => {
      // Signal ready to all clients
      const clients = await self.clients.matchAll({ includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: 'V_SW_LISTEN_READY' })
      }
    })
  )
})

// Message handler for test control
// Note: Controller protocol messages (V_SW_VERSION, V_SW_SESSION_INIT, etc.)
// are handled automatically by createSvcWorkerServer (via createSvcWorker)
self.addEventListener('message', async (event) => {
  const data = event.data
  if (!data || typeof data.type !== 'string') {return}

  // Respond to listen-ready ping from main thread
  if (data.type === 'V_SW_LISTEN_READY_PING' && listenReady) {
    const clientId = (event.source as Client | null)?.id
    if (clientId) {
      const client = await self.clients.get(clientId)
      client?.postMessage({ type: 'V_SW_LISTEN_READY' })
    }
    return
  }

  const port = event.ports?.[0]

  switch (data.type) {
    // Test control: Get server status
    case 'GET_SERVER_STATUS':
      port?.postMessage({
        type: 'SERVER_STATUS',
        hasServer: server !== null,
        hasMiddlewares: server?.middlewares !== undefined,
        hasHttpServer: server?.httpServer !== undefined,
      })
      break

    // Test control: Close server
    case 'CLOSE_SERVER':
      try {
        await server?.close()
        port?.postMessage({ type: 'SERVER_CLOSED', success: true })
      } catch (error) {
        port?.postMessage({ type: 'SERVER_CLOSED', success: false, error: String(error) })
      }
      break
  }
})
