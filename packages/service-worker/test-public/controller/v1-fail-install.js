/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'

sw.addEventListener('message', event => {
  const data = event.data
  if (!data || typeof data.type !== 'string') return

  switch (data.type) {
    case 'V_SW_VERSION': {
      const port = event.ports && event.ports[0]
      port?.postMessage({ type: 'V_SW_VERSION', version: SW_VERSION })
      break
    }
    case 'V_SW_SKIP_WAITING': {
      self.skipWaiting()
      break
    }
  }
})

// Installation fails
sw.addEventListener('install', event => {
  event.waitUntil(Promise.reject(new Error('Installation failed intentionally')))
})
