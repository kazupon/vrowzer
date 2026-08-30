/// <reference lib="webworker" />

/**
 * Test Service Worker that supports controller sessions but ignores clients.claim().
 */

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'
const sessions = new Map()

function handleSessionMessage(clientId, port, data) {
  switch (data.type) {
    case 'V_SW_SESSION_CLOSE':
      port.close()
      sessions.delete(clientId)
      break
    case 'V_SW_SESSION_PONG': {
      const session = sessions.get(clientId)
      if (session) {
        session.lastPong = Date.now()
      }
      break
    }
  }
}

sw.addEventListener('message', event => {
  const data = event.data
  if (!data || typeof data.type !== 'string') {
    return
  }

  switch (data.type) {
    case 'V_SW_VERSION': {
      const port = event.ports[0]
      port?.postMessage({ type: 'V_SW_VERSION', version: SW_VERSION })
      break
    }
    case 'V_SW_SKIP_WAITING':
      sw.skipWaiting()
      break
    case 'V_SW_SESSION_INIT': {
      const port = event.ports[0]
      const clientId = event.source?.id
      if (port && clientId) {
        sessions.get(clientId)?.port.close()
        port.addEventListener('message', messageEvent => {
          handleSessionMessage(clientId, port, messageEvent.data)
        })
        port.start()
        sessions.set(clientId, { port, lastPong: Date.now() })
        port.postMessage({
          type: 'V_SW_SESSION_INIT',
          success: true,
          version: SW_VERSION
        })
      }
      break
    }
    // Intentionally ignore V_SW_CLAIM_CLIENTS.
  }
})

sw.addEventListener('install', event => {
  event.waitUntil(sw.skipWaiting())
})
