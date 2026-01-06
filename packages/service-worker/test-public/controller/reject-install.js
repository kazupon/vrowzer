/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

sw.addEventListener('install', event => {
  event.waitUntil(Promise.reject())
})
