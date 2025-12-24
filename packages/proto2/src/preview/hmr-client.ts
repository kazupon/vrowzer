/**
 * HMR Client for iframe preview
 * Communicates with Service Worker for hot module replacement
 */

import { createLogger } from '../logger.ts'

import type {
  HMRFullReloadMessage,
  HMRUpdateMessage,
  ServiceWorkerToIframeMessage
} from '../messages/types.ts'

const logger = createLogger('hmr-client')

logger.debug('Initializing...')

// Loaded modules cache
const loadedModules = new Map<string, unknown>()

// Module accept callbacks
const acceptCallbacks = new Map<string, () => void>()

// MessagePort for communication with Service Worker
let serviceWorkerPort: MessagePort | null = null

/**
 * Listen for messages from parent window (for MessagePort handshake)
 */
window.addEventListener('message', event => {
  const message = event.data as { type: string; port?: MessagePort }

  logger.debug('Window message:', message.type)

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
  logger.debug('Connected to Service Worker via MessagePort')
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

  logger.debug('Service Worker message:', message.type)

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
      debug('Unknown message type:', message.type)
      break
    }
  }
}

/**
 * Handle HMR update message
 */
function handleHmrUpdate(message: HMRUpdateMessage) {
  logger.debug('HMR update received:', message.updates)

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
  logger.debug('Full reload requested:', message.path)
  window.location.reload()
}

/**
 * Reload a JavaScript module
 */
async function reloadModule(path: string, timestamp: number) {
  logger.debug('Reloading module:', path)

  try {
    // Import the updated module with cache-busting timestamp
    const url = `${path}?t=${timestamp}`
    const module = await import(/* @vite-ignore */ url)

    // Store in cache
    loadedModules.set(path, module)

    // Call accept callback if registered
    const callback = acceptCallbacks.get(path)
    if (callback) {
      logger.debug('Calling accept callback for:', path)
      callback()
    }

    logger.debug('Module reloaded:', path)
    notifySuccess()
  } catch (error) {
    logger.error('Failed to reload module:', path, error)
    notifyError(error instanceof Error ? error.message : String(error))
  }
}

/**
 * Reload CSS
 */
function reloadCss(path: string, timestamp: number) {
  logger.debug('Reloading CSS:', path)

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

  logger.debug('CSS reloaded:', path)
}

function notifySuccess() {
  window.parent.postMessage({ type: 'success' }, '*')
}

function notifyError(message: string) {
  window.parent.postMessage({ type: 'error', message }, '*')
}

function init() {
  logger.debug('Ready')

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
