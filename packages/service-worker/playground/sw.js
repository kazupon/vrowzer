/// <reference lib="webworker" />

import { createSvcWorker } from '@vrowzer/service-worker/worker'

const SW_VERSION = '2026-01-16-001'

// Create the service worker wrapper
const sw = createSvcWorker(self, {
  version: SW_VERSION,
  debug: console.log
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
  console.log('[SW] fetch', event.request.url)
  // Circuit breaker: bypass when suspended
  if (sw.suspended) {
    console.log('[SW] Suspended - bypassing fetch handler')
    return // Let browser handle the request
  }

  const url = new URL(event.request.url)

  // Demo endpoint: /api/status
  if (url.pathname === '/api/status') {
    event.respondWith(
      new Response(
        JSON.stringify({
          source: 'service-worker',
          version: sw.version,
          sessionCount: sw.sessionCount,
          suspended: sw.suspended,
          timestamp: Date.now()
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )
    return
  }

  // Demo endpoint: /api/echo
  if (url.pathname === '/api/echo') {
    event.respondWith(
      new Response(
        JSON.stringify({
          source: 'service-worker',
          method: event.request.method,
          url: event.request.url,
          headers: Object.fromEntries(event.request.headers.entries())
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

// Message event for custom messaging
sw.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data)
})
