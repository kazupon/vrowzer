/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

sw.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      await sleep(100)
      await sw.skipWaiting()
    })()
  )
})
