/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'

// Session management
const sessions = new Map()

function handleSessionMessage(clientId, port, data) {
  switch (data.type) {
    case 'V_SW_SESSION_CLOSE':
      port.close()
      sessions.delete(clientId)
      break
    case 'V_SW_SESSION_PONG':
      const session = sessions.get(clientId)
      if (session) {
        session.lastPong = Date.now()
      }
      break
  }
}

sw.addEventListener('message', event => {
  const data = event.data
  if (!data || typeof data.type !== 'string') {
    return
  }

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
    case 'V_SW_SESSION_INIT': {
      const port = event.ports && event.ports[0]
      const clientId = event.source?.id
      if (port && clientId) {
        // Close existing session if any
        const existing = sessions.get(clientId)
        if (existing) {
          existing.port.close()
        }
        // Setup new session
        port.addEventListener('message', e => {
          handleSessionMessage(clientId, port, e.data)
        })
        port.start()
        sessions.set(clientId, { port, lastPong: Date.now() })
        port.postMessage({ success: true, version: SW_VERSION })
      }
      break
    }
  }
})

sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})
