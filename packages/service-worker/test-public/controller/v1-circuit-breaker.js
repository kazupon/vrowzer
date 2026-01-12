/// <reference lib="webworker" />

/**
 * Test Service Worker with Circuit Breaker protocol support
 *
 * This service worker implements:
 * - V_SW_VERSION
 * - V_SW_SKIP_WAITING
 * - V_SW_SESSION_INIT
 * - V_SW_SESSION_CLOSE
 * - V_SW_SESSION_PONG
 * - V_SW_SESSION_CIRCUIT_BREAKER (suspend/terminate)
 * - V_SW_SESSION_RESUME
 */

/** @type {ServiceWorkerGlobalScope} */
const sw = self

const SW_VERSION = 'v1'

// Session management
const sessions = new Map()

// Circuit breaker state
let _suspended = false

function handleSessionMessage(clientId, port, data) {
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return
  }

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

    case 'V_SW_SESSION_CIRCUIT_BREAKER': {
      // oxlint-disable-next-line @typescript-eslint/no-floating-promises -- For testing
      handleCircuitBreaker(data, port)
      break
    }

    case 'V_SW_SESSION_RESUME': {
      handleResume(data, port)
      break
    }
  }
}

async function handleCircuitBreaker(message, port) {
  const cachesCleared = []

  try {
    if (message.mode === 'suspend') {
      _suspended = true
    }

    if (message.clearCaches) {
      const cacheNames = await caches.keys()
      for (const name of cacheNames) {
        await caches.delete(name)
        cachesCleared.push(name)
      }
    }

    if (message.mode === 'terminate') {
      // Notify all sessions about termination before unregistering
      for (const [, session] of sessions) {
        try {
          session.port.postMessage({
            type: 'V_SW_SESSION_TERMINATED',
            reason: 'unregister'
          })
        } catch {
          // Port may already be closed, ignore
        }
      }
      await sw.registration.unregister()
    }

    port.postMessage({
      type: 'V_SW_SESSION_CIRCUIT_BREAKER',
      id: message.id,
      success: true,
      data: {
        mode: message.mode,
        terminated: message.mode === 'terminate',
        cachesCleared
      }
    })
  } catch (error) {
    port.postMessage({
      type: 'V_SW_SESSION_CIRCUIT_BREAKER',
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function handleResume(message, port) {
  try {
    _suspended = false

    port.postMessage({
      type: 'V_SW_SESSION_RESUME',
      id: message.id,
      success: true,
      data: {}
    })
  } catch (error) {
    port.postMessage({
      type: 'V_SW_SESSION_RESUME',
      id: message.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

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
        // Must include type field for isSvcWorkerSessionInitResponse type guard
        port.postMessage({
          type: 'V_SW_SESSION_INIT',
          success: true,
          version: SW_VERSION
        })
      }
      break
    }
  }
})

sw.addEventListener('activate', event => {
  event.waitUntil(sw.clients.claim())
})

sw.addEventListener('fetch', _event => {
  // If suspended, bypass all fetch handling
  if (_suspended) {
    return
  }

  // Normal fetch handling (for testing purposes, just pass through)
  // In a real scenario, you might cache resources here
})
