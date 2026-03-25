/// <reference lib="webworker" />

/**
 * E2E Test Service Worker using built @vrowzer/service-worker/worker module
 *
 * This service worker is used for e2e tests and imports from the built dist files.
 * Since this file is in publicDir (test-public), it's served as a static file
 * without Vite transformation, so we use direct path to dist instead of aliases.
 */

// import { createSvcWorker } from '@vrowzer/service-worker/worker'
// same as above, but adjusted for static serving:
import { createSvcWorker } from '/dist/worker.js'

// Get version from URL query parameter (e.g., /e2e-sw.js?version=v1)
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

// Claim clients on activation for immediate control
sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
