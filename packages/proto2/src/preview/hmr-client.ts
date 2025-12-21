/**
 * HMR Client for iframe preview
 * Communicates with Service Worker for hot module replacement
 */

import type {
  HMRFullReloadMessage,
  HMRUpdateMessage,
  ServiceWorkerToIframeMessage
} from '../messages/types'

console.log('[HMR Client] Initializing...')

// Loaded modules cache
const loadedModules = new Map<string, unknown>()

// Module accept callbacks
const acceptCallbacks = new Map<string, () => void>()

// MessagePort for communication with Service Worker
let serviceWorkerPort: MessagePort | null = null

/**
 * HMR API (injected into import.meta.hot)
 */
interface HotModule {
  accept(callback?: () => void): void
  dispose(callback: () => void): void
  data: Record<string, unknown>
}

declare global {
  interface ImportMeta {
    hot?: HotModule
  }
}

/**
 * Listen for messages from parent window (for MessagePort handshake)
 */
window.addEventListener('message', event => {
  const message = event.data as { type: string; port?: MessagePort }

  console.log('[HMR Client] Window message:', message.type)

  switch (message.type) {
    case 'connect-service-worker': {
      handleConnectServiceWorker(message.port!)
      break
    }
    default: {
      // Ignore other messages
      break
    }
  }
})

/**
 * Handle connect-service-worker message (MessagePort from main thread)
 */
function handleConnectServiceWorker(port: MessagePort) {
  console.log('[HMR Client] Connected to Service Worker via MessagePort')
  serviceWorkerPort = port

  // Listen for messages from Service Worker
  serviceWorkerPort.onmessage = handleSwMessage
  serviceWorkerPort.start()

  // Notify SW that HMR client is ready
  serviceWorkerPort.postMessage({ type: 'hmr-client-ready' })
}

/**
 * Handle messages from Service Worker via MessagePort
 */
function handleSwMessage(event: MessageEvent<ServiceWorkerToIframeMessage>) {
  const message = event.data

  console.log('[HMR Client] SW message:', message.type)

  switch (message.type) {
    case 'hmr-update': {
      handleHmrUpdate(message)
      break
    }
    case 'hmr-full-reload': {
      handleFullReload(message)
      break
    }
    default: {
      // @ts-expect-error -- FIXME: type
      console.warn('[HMR Client] Unknown message type:', message.type)
      break
    }
  }
}

/**
 * Handle HMR update message
 */
function handleHmrUpdate(message: HMRUpdateMessage) {
  console.log('[HMR Client] HMR update received:', message.updates)

  for (const update of message.updates) {
    if (update.type === 'js-update') {
      reloadModule(update.path, update.timestamp)
    } else if (update.type === 'css-update') {
      reloadCss(update.path, update.timestamp)
    }
  }
}

/**
 * Handle full reload message
 */
function handleFullReload(message: HMRFullReloadMessage) {
  console.log('[HMR Client] Full reload requested:', message.path)
  window.location.reload()
}

/**
 * Reload a JavaScript module
 */
async function reloadModule(path: string, timestamp: number) {
  console.log('[HMR Client] Reloading module:', path)

  try {
    // Import the updated module with cache-busting timestamp
    const url = `${path}?t=${timestamp}`
    const module = await import(/* @vite-ignore */ url)

    // Store in cache
    loadedModules.set(path, module)

    // Call accept callback if registered
    const callback = acceptCallbacks.get(path)
    if (callback) {
      console.log('[HMR Client] Calling accept callback for:', path)
      callback()
    }

    console.log('[HMR Client] Module reloaded:', path)
    notifySuccess()
  } catch (error) {
    console.error('[HMR Client] Failed to reload module:', path, error)
    notifyError(error instanceof Error ? error.message : String(error))
  }
}

/**
 * Reload CSS
 */
function reloadCss(path: string, timestamp: number) {
  console.log('[HMR Client] Reloading CSS:', path)

  // Find existing link element
  const existingLink = document.querySelector(`link[href*="${path}"]`) as HTMLLinkElement | null

  if (existingLink) {
    // Update href with cache-busting timestamp
    existingLink.href = `${path}?t=${timestamp}`
  } else {
    // Create new link element
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${path}?t=${timestamp}`
    document.head.appendChild(link)
  }

  console.log('[HMR Client] CSS reloaded:', path)
}

function notifySuccess() {
  window.parent.postMessage({ type: 'success' }, '*')
}

function notifyError(message: string) {
  window.parent.postMessage({ type: 'error', message }, '*')
}

function init() {
  console.log('[HMR Client] Ready')

  // Notify parent that HMR client is ready
  window.parent.postMessage({ type: 'hmr-client-ready' }, '*')

  // Update the app content
  const app = document.getElementById('app')
  if (app) {
    app.innerHTML = '<p>HMR Client Ready - Waiting for updates...</p>'
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

export {}
