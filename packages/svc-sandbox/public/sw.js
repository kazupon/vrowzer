/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const EXPECTED_SW_VERSION = '2026-01-07-001'

sw.addEventListener('message', event => {
  console.log("Service Worker 'message' event", event.data?.type)

  const data = event.data
  if (!data || typeof data.type !== 'string') return

  switch (data.type) {
    case 'GET_VERSION': {
      // Expect a MessageChannel port so we can reply directly
      const port = event.ports && event.ports[0]
      port?.postMessage({ version: EXPECTED_SW_VERSION })
      break
    }

    case 'SKIP_WAITING': {
      // Promote a waiting worker to become active ASAP
      self.skipWaiting()
      break
    }

    default:
      // ignore
      break
  }
})

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

sw.addEventListener('install', event => {
  console.log(`Service Wosrker 'install' event`, event)
  // event.waitUntil(timeout(10000));
})

sw.addEventListener('activate', event => {
  console.log(`Service Worker 'activate' event`, event)
  // event.waitUntil(sw.clients.claim());
})
