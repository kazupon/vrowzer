/// <reference lib="webworker" />

// import { rolldown } from '@rolldown/browser'
// console.log('[Service Worker] Rolldown version:', rolldown)

declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = 'sw-test-v1'

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Install')
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Activate')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event: FetchEvent) => {
  console.log('[Service Worker] Fetch event for:', event.request)
  const url = new URL(event.request.url)

  // same-origin かつ /src/preview/ 配下だけ
  if (url.origin === self.location.origin && url.pathname.startsWith('/src/preview/')) {
    console.log('[Service Worker] Fetch handled:', event.request.url)
    event.respondWith(fetch(event.request))
    return
  } else {
    console.log('[Service Worker] Fetch ignored:', event.request.url)
  }
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[Service Worker] Message:', event.data)
})

export {}
