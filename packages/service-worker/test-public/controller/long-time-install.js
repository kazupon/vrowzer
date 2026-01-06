/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

sw.addEventListener('install', event => {
  event.waitUntil(
    new Promise(async resolve => {
      await sleep(2000)
      resolve()
    })
  )
})
