/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'

sw.addEventListener('message', event => {
  const data = event.data
  if (!data || typeof data.type !== 'string') return

  switch (data.type) {
    case 'VROWSER_SW_GET_VERSION': {
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

// No clients.claim() - page needs reload to be controlled
sw.addEventListener('activate', () => {
  // Do nothing - page won't be controlled until navigation/reload
})
