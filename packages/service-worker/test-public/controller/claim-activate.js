/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
