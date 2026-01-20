/// <reference lib="webworker" />

/**
 * E2E Test Service Worker using SvcWorkerServer
 *
 * This service worker demonstrates the SvcWorkerServer API
 * for handling fetch events in a server-like manner.
 */

import { SvcWorkerServer } from '/dist/index.js'

// Get version from URL query parameter (e.g., /e2e-server-sw.js?version=v1)
const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'
const claimOnActivate = url.searchParams.get('claim') !== 'false' // default: true

// Create server instance
const server = new SvcWorkerServer(self, {
  version,
  claimOnActivate
})

// Track server events for testing
const serverState = {
  listening: false,
  closed: false,
  errors: [],
  version
}

// Listen for server events
server.on('listening', () => {
  serverState.listening = true
  console.log('[SW] Server listening')
})

server.on('close', () => {
  serverState.closed = true
  serverState.listening = false
  console.log('[SW] Server closed')
})

server.on('error', err => {
  serverState.errors.push(err.message)
  console.error('[SW] Server error:', err.message)
})

// Fetch handler
function handleFetch(event) {
  const url = new URL(event.request.url)

  // /api/test - Return server state
  if (url.pathname === '/api/test') {
    event.respondWith(
      new Response(
        JSON.stringify({
          version: serverState.version,
          listening: serverState.listening,
          closed: serverState.closed,
          errors: serverState.errors
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
    return
  }

  // /api/echo - Echo back request body
  if (url.pathname === '/api/echo') {
    event.respondWith(
      (async () => {
        const body = await event.request.text()
        return new Response(JSON.stringify({ echo: body }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })()
    )
    return
  }

  // /api/close - Trigger server.close()
  if (url.pathname === '/api/close') {
    server.close(err => {
      console.log('[SW] Close callback called', err)
    })
    event.respondWith(
      new Response(JSON.stringify({ closed: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    )
    return
  }

  // /api/error - Trigger an error in fetch handler
  if (url.pathname === '/api/error') {
    throw new Error('Intentional test error')
  }

  // Default: fall through to network
}

// Start listening for fetch events
server.listen(handleFetch)

// Expose server for testing via postMessage
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_STATE') {
    event.ports[0]?.postMessage({
      type: 'STATE',
      state: serverState
    })
  }

  if (event.data?.type === 'CLOSE_SERVER') {
    server.close(() => {
      event.ports[0]?.postMessage({ type: 'CLOSED' })
    })
  }

  if (event.data?.type === 'DOUBLE_LISTEN') {
    // Attempt to call listen() again (should emit error)
    server.listen(handleFetch)
    event.ports[0]?.postMessage({ type: 'DOUBLE_LISTEN_ATTEMPTED' })
  }
})
