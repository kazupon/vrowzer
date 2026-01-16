/// <reference lib="webworker" />

import { createSvcWorker } from '@vrowser/service-worker/worker'

const SW_VERSION = 'e2e-test-v1'

// Create the service worker wrapper
const sw = createSvcWorker(self, {
  version: SW_VERSION
})

// Install event
sw.addEventListener('install', _event => {
  console.log('[SW] Install event', { version: sw.version })
})

// Activate event - claim clients for immediate control
sw.addEventListener('activate', event => {
  console.log('[SW] Activate event', { version: sw.version })
  event.waitUntil(sw.clients.claim())
})

// Fetch event with circuit breaker support
sw.addEventListener('fetch', event => {
  // Circuit breaker: bypass when suspended
  if (sw.suspended) {
    return // Let browser handle the request
  }

  const url = new URL(event.request.url)

  // Test endpoint: /api/test
  if (url.pathname === '/api/test') {
    event.respondWith(
      new Response(
        JSON.stringify({
          version: sw.version,
          sessionCount: sw.sessionCount,
          suspended: sw.suspended
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
    return
  }

  // Default: pass through to network
})
