/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v2'

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

sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
