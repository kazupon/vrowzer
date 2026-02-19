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
    case 'V_SW_CLAIM_CLIENTS': {
      // Claim clients when explicitly requested via message
      self.clients.claim()
      break
    }
    case 'V_SW_SESSION_INIT': {
      const port = event.ports && event.ports[0]
      const clientId = event.source?.id
      if (port && clientId) {
        const existing = sessions.get(clientId)
        if (existing) {
          existing.port.close()
        }
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

// No clients.claim() in activate - waits for V_SW_CLAIM_CLIENTS message
sw.addEventListener('activate', () => {
  // Do nothing - page won't be controlled until V_SW_CLAIM_CLIENTS is received
})
