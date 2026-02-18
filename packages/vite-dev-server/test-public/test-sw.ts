/// <reference lib="webworker" />
import { createServer, type ViteDevServer } from '@vrowser/vite-dev-server'

declare const self: ServiceWorkerGlobalScope

// Service Worker version - must match what the test controller expects
const SW_VERSION = 'test-v1'

// Create listenable server synchronously - fetch event is registered immediately
// This MUST be at script top-level to register fetch handler during script evaluation
// The version option is passed to createSvcWorkerServer which handles controller protocol
const listenableServer = createServer(
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
let server: Omit<ViteDevServer, 'listen'> | null = null

// Service Worker install
self.addEventListener('install', (_event) => {
  // Skip waiting to activate immediately, if you want to skip waiting
  // self.skipWaiting()
})

// Service Worker activate
// Note: createSvcWorkerServer handles clients.claim() via claimOnActivate option
// We start the server during activation - listen() returns a Promise that resolves when ready
self.addEventListener('activate', (event) => {
  event.waitUntil(
    listenableServer.listen().then(s => {
      server = s
    })
  )
})

// Message handler for test control
// Note: Controller protocol messages (V_SW_VERSION, V_SW_SESSION_INIT, etc.)
// are handled automatically by createSvcWorkerServer (via createSvcWorker)
self.addEventListener('message', async (event) => {
  const data = event.data
  if (!data || typeof data.type !== 'string') {return}

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
