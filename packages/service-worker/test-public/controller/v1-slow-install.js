/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

sw.addEventListener('message', event => {
  const data = event.data
  if (!data || typeof data.type !== 'string') return

  switch (data.type) {
    case 'VROWSER_SW_VERSION': {
      const port = event.ports && event.ports[0]
      port?.postMessage({ version: SW_VERSION })
      break
    }
    case 'VROWSER_SW_SKIP_WAITING': {
      self.skipWaiting()
      break
    }
  }
})

// Slow install - takes 2 seconds (for abort testing)
sw.addEventListener('install', event => {
  event.waitUntil(timeout(2000))
})

sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
