/// <reference lib="webworker" />

/**
 * E2E Test Service Worker WITHOUT clients.claim()
 *
 * This service worker is used for testing the reloadSuggested event.
 * It does NOT call clients.claim(), so the page won't be controlled
 * until a reload occurs.
 */

import { createSvcWorker } from '/dist/worker.js'

// Get version from URL query parameter (e.g., /e2e-sw-no-claim.js?version=v1)
const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'

// Create the service worker wrapper
const sw = createSvcWorker(self, {
  version
})

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

// NOTE: No clients.claim() here - page won't be controlled until reload
