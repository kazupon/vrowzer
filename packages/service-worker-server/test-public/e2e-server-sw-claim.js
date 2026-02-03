/// <reference lib="webworker" />

/**
 * E2E Test Service Worker with claimOnActivate: true
 */

import { createSvcWorkerServer } from '/dist/index.js'

const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'

const server = createSvcWorkerServer(self, {
  version,
  claimOnActivate: true // Explicitly true
})

server.on('listening', () => {
  console.log('[SW-CLAIM] Server listening with claimOnActivate')
})

server.setFetchHandler(event => {
  if (event.request.url.includes('/api/test')) {
    event.respondWith(
      new Response(
        JSON.stringify({
          version,
          claimed: true
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
  }
})
server.listen()
