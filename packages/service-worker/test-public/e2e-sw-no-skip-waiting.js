/// <reference lib="webworker" />

/**
 * E2E Test Service Worker WITHOUT skipWaiting
 *
 * This service worker does NOT call skipWaiting() during install,
 * so it will go to waiting state if there's an existing active SW.
 * Used for testing skipWaitingPolicy behavior.
 */

import { createSvcWorker } from '/dist/worker.js'

// Get version from URL query parameter
const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'

// Create the service worker wrapper
const sw = createSvcWorker(self, {
  version
})

// NOTE: No skipWaiting() in install - SW will go to waiting state
// if there's an existing active SW

// Add fetch handler that respects circuit breaker
sw.addEventListener('fetch', event => {
  // If suspended (circuit breaker engaged), bypass all custom handling
  if (sw.suspended) {
    return
  }

  // For testing: respond with a simple JSON for /api/test endpoint
  if (event.request.url.includes('/api/test')) {
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

  // Default: let the browser handle the request
})

// Claim clients on activation for immediate control
sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
