/// <reference lib="webworker" />

/**
 * E2E Test Service Worker with skipWaiting
 *
 * This service worker calls skipWaiting() during install event,
 * allowing it to activate immediately without waiting for existing clients to close.
 */

import { createSvcWorker } from '/dist/worker.js'

// Get version from URL query parameter (e.g., /e2e-sw-skip-waiting.js?version=v1)
const url = new URL(self.location.href)
const version = url.searchParams.get('version') || 'v1'

// Create the service worker wrapper
const sw = createSvcWorker(self, {
  version
})

// Skip waiting during install to activate immediately
sw.addEventListener('install', () => {
  sw.skipWaiting()
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
