/// <reference lib="webworker" />

/**
 * E2E Test Service Worker with claimOnActivate: false
 */

import { createSvcWorkerServer } from '/dist/index.js'

const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'

const server = createSvcWorkerServer(self, {
  version,
  claimOnActivate: false // Explicitly false
})

server.on('listening', () => {
  console.log('[SW-NO-CLAIM] Server listening without claimOnActivate')
})

server.setFetchHandler(event => {
  if (event.request.url.includes('/api/test')) {
    event.respondWith(
      new Response(
        JSON.stringify({
          version,
          claimed: false
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
  }
})
server.listen()
