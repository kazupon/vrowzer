/**
 * E2E test page script for SvcWorkerServer
 *
 * This script registers the Service Worker and exposes test state
 * via window.testState for Playwright to access.
 */

const statusEl = document.getElementById('status')
const serverStateEl = document.getElementById('server-state')
const versionEl = document.getElementById('version')
const errorsEl = document.getElementById('errors')

// Get configuration from URL query parameters
const params = new URLSearchParams(window.location.search)
const swVersion = params.get('version') || 'v1'
const swPath = params.get('sw') || `/e2e-server-sw.js?version=${swVersion}`
const scope = params.get('scope') || '/'
const activateTimeout = params.get('timeout') ? parseInt(params.get('timeout')!, 10) : undefined

// Expose test state globally for Playwright
window.testState = {
  registration: null,
  serviceWorker: null,
  serverState: null,
  events: [],
  errors: [],
  controllerChanges: []
}

// Track controllerchange events
navigator.serviceWorker.addEventListener('controllerchange', () => {
  const controller = navigator.serviceWorker.controller
  window.testState.controllerChanges.push({
    time: Date.now(),
    controller: controller?.scriptURL ?? null
  })
})

// Helper to communicate with Service Worker
async function sendMessageToSW<T = unknown>(type: string, data?: unknown): Promise<T> {
  const sw = navigator.serviceWorker.controller
  if (!sw) {
    throw new Error('No active Service Worker controller')
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = event => {
      resolve(event.data as T)
    }
    channel.port1.onerror = reject
    sw.postMessage({ type, ...data }, [channel.port2])
  })
}

// Expose helper for tests
window.sendMessageToSW = sendMessageToSW

async function init() {
  try {
    statusEl!.textContent = 'Registering Service Worker...'

    // Register Service Worker
    const registration = await navigator.serviceWorker.register(swPath, {
      scope,
      type: 'module'
    })

    window.testState.registration = registration
    statusEl!.textContent = 'Waiting for Service Worker...'

    // Wait for the service worker to be ready
    const sw = registration.installing || registration.waiting || registration.active
    if (!sw) {
      throw new Error('No Service Worker found after registration')
    }

    window.testState.serviceWorker = sw

    // Wait for activation
    await new Promise<void>((resolve, reject) => {
      if (sw.state === 'activated') {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Service Worker activation timeout'))
      }, activateTimeout ?? 30000)

      sw.addEventListener('statechange', function handler() {
        if (sw.state === 'activated') {
          clearTimeout(timeout)
          sw.removeEventListener('statechange', handler)
          resolve()
        }
        if (sw.state === 'redundant') {
          clearTimeout(timeout)
          sw.removeEventListener('statechange', handler)
          reject(new Error('Service Worker became redundant'))
        }
      })
    })

    statusEl!.textContent = 'activated'
    versionEl!.textContent = `Version: ${swVersion}`

    // Try to get server state via API
    if (navigator.serviceWorker.controller) {
      try {
        const response = await fetch('/api/test')
        const state = await response.json()
        window.testState.serverState = state
        serverStateEl!.textContent = `Server: ${JSON.stringify(state)}`
      } catch {
        console.log('Could not fetch server state (page may not be controlled yet)')
      }
    }
  } catch (error) {
    const err = error as Error
    statusEl!.textContent = `error: ${err.message}`
    window.testState.errors.push(err.message)
    errorsEl!.textContent = `Errors: ${err.message}`
    console.error('Init error:', error)
  }
}

// Start initialization
init().catch(console.error)
