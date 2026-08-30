/// <reference lib="webworker" />

/**
 * Legacy Service Worker fixture without Vrowzer message or fetch handlers.
 */

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
