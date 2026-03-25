/// <reference lib="webworker" />

import { createSvcWorker } from '@vrowzer/service-worker/worker'

const SW_VERSION = 'e2e-test-v1'

// WASM URL — transformed by wasmInlinePlugin (base64 data URL) or wasmUrlPlugin (self.location.href)
// May fail in webpack/rspack child compiler where import.meta.url is unavailable in SW context
let wasmUrl = null
try {
  wasmUrl = new URL('./add.wasm', import.meta.url)
} catch {
  // WASM not available in this bundler's SW output
}

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

  // Test endpoint: /api/wasm-add?a=2&b=3 — uses inlined WASM to add two numbers
  if (url.pathname === '/api/wasm-add') {
    if (!wasmUrl) {
      event.respondWith(
        new Response(JSON.stringify({ error: 'WASM not available' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      return
    }
    event.respondWith(
      (async () => {
        // Use fetch + arrayBuffer + instantiate instead of instantiateStreaming
        // because data URLs from inlined WASM don't have the correct MIME type
        const response = await fetch(wasmUrl)
        const buffer = await response.arrayBuffer()
        const { instance } = await WebAssembly.instantiate(buffer)
        const add = /** @type {(a: number, b: number) => number} */ (instance.exports.add)
        const a = Number(url.searchParams.get('a') || 0)
        const b = Number(url.searchParams.get('b') || 0)
        const result = add(a, b)
        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })()
    )
    return
  }

  // Default: pass through to network
})
