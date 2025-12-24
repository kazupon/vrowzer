/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

import { createLogger } from '../logger.ts'

import type {
  FileChangeMessage,
  HMRUpdateMessage,
  IframeToServiceWorkerMessage,
  MainToServiceWorkerMessage,
  ResolveResponse,
  ServiceWorkerToWorkerMessage,
  TransformResponse,
  WorkerToServiceWorkerMessage
} from '../messages/types.ts'

const logger = createLogger('service-worker')
logger.debug('Service Worker loaded')

// Virtual file system
const files = new Map<string, string>()

// MessagePort for communication with Web Worker
let workerPort: MessagePort | null = null

// MessagePort for communication with iframe (HMR)
let iframePort: MessagePort | null = null

/**
 * Service Worker Install Event
 */
self.addEventListener('install', event => {
  logger.debug('Installing...')
  event.waitUntil(self.skipWaiting())
})

/**
 * Service Worker Activate Event
 */
self.addEventListener('activate', event => {
  logger.debug('Activating...')
  event.waitUntil(self.clients.claim())
})

/**
 * Message Handling from Main Thread
 */
self.addEventListener('message', event => {
  const message = event.data as MainToServiceWorkerMessage
  logger.debug('Received message:', message.type)

  switch (message.type) {
    case 'init': {
      handleInit(event.source as Client)
      break
    }
    case 'connect-worker': {
      handleConnectWorker(message.port)
      break
    }
    case 'connect-iframe': {
      handleConnectIframe(message.port)
      break
    }
    case 'file-change': {
      handleFileChange(message as FileChangeMessage)
      break
    }
    default: {
      // @ts-expect-error -- FIXME: type
      logger.warn('Unknown message type:', message.type)
    }
  }
})

/**
 * Handle init message from main thread
 */
function handleInit(client: Client) {
  logger.debug('Init from client:', client.id, client)
  // hmrClients.add(client)

  // Send ready notification
  client.postMessage({ type: 'service-worker-ready' })
}

/**
 * Handle connect-worker message (MessagePort from main thread)
 */
function handleConnectWorker(port: MessagePort) {
  logger.debug('Connected to Web Worker via MessagePort')
  workerPort = port

  // Listen for messages from Web Worker
  workerPort.onmessage = handleWorkerMessage
  workerPort.start()
}

/**
 * Handle connect-iframe message (MessagePort from main thread)
 */
function handleConnectIframe(port: MessagePort) {
  logger.debug('Connected to iframe via MessagePort')
  iframePort = port

  // Listen for messages from iframe
  iframePort.onmessage = handleIframeMessage
  iframePort.start()
}

/**
 * Handle messages from iframe
 */
function handleIframeMessage(event: MessageEvent<IframeToServiceWorkerMessage>) {
  const message = event.data
  logger.debug('Message from iframe:', message.type)

  switch (message.type) {
    case 'hmr-client-ready': {
      logger.debug('HMR client is ready')
      break
    }
    default: {
      logger.warn('Unknown iframe message type:', message.type)
    }
  }
}

/**
 * Handle messages from Web Worker
 */
function handleWorkerMessage(event: MessageEvent<WorkerToServiceWorkerMessage>) {
  const message = event.data
  logger.debug('Message from Worker:', message.type)

  switch (message.type) {
    case 'transform-result': {
      handleTransformResult(message)
      break
    }
    case 'resolve-result': {
      handleResolveResult(message)
      break
    }
    default: {
      logger.warn('Unknown worker message type:', (message as { type: string }).type)
    }
  }
}

/**
 * Handle file change from editor
 */
function handleFileChange(message: FileChangeMessage) {
  const { file, content } = message
  logger.debug('File changed:', file)

  // Update virtual file system
  files.set(file, content)

  // Request transform from Web Worker
  if (workerPort) {
    const request: ServiceWorkerToWorkerMessage = {
      type: 'transform',
      id: generateId(),
      url: file,
      code: content
    }
    workerPort.postMessage(request)
  }

  // Send HMR update to all clients
  notifyHmrUpdate(file)
}

/**
 * Handle transform result from Web Worker
 */
function handleTransformResult(message: TransformResponse) {
  logger.debug('Transform result for:', message.id)

  if (message.error) {
    logger.error('Transform error:', message.error)
    return
  }

  // Store transformed code
  // In a real implementation, we would cache this
  logger.debug('Transformed code length:', message.code?.length)
}

/**
 * Handle resolve result from Web Worker
 */
function handleResolveResult(message: ResolveResponse) {
  logger.debug('Resolve result:', message.id, message.resolved)
}

/**
 * Send HMR update notification to iframe via MessagePort
 */
function notifyHmrUpdate(path: string) {
  if (!iframePort) {
    logger.warn('[No iframe port connected, cannot send HMR update')
    return
  }

  const message: HMRUpdateMessage = {
    type: 'hmr-update',
    updates: [
      {
        type: 'js-update',
        path,
        acceptedPath: path,
        timestamp: Date.now()
      }
    ]
  }

  iframePort.postMessage(message)
  logger.debug('Sent HMR update via MessagePort')
}

/**
 * Fetch interception
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Only intercept requests for our virtual files
  if (url.pathname.startsWith('/src/preview/') || files.has(url.pathname)) {
    logger.debug('Intercepting:', url.pathname)
    event.respondWith(handleFetch(event.request, url))
  }
})

/**
 * Handle fetch request
 */
async function handleFetch(request: Request, url: URL): Promise<Response> {
  const pathname = url.pathname

  // Check if file exists in virtual FS
  const content = files.get(pathname)
  if (content) {
    logger.debug('Serving from virtual FS:', pathname)
    return new Response(content, {
      headers: {
        'Content-Type': getContentType(pathname),
        'Cache-Control': 'no-cache'
      }
    })
  }

  // Fallback to network
  try {
    return await fetch(request)
  } catch (error) {
    logger.error('Fetch error:', error)
    return new Response('Not Found', { status: 404 })
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function getContentType(pathname: string): string {
  if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
    return 'application/javascript'
  }
  if (pathname.endsWith('.ts')) {
    return 'application/javascript'
  }
  if (pathname.endsWith('.css')) {
    return 'text/css'
  }
  if (pathname.endsWith('.html')) {
    return 'text/html'
  }
  if (pathname.endsWith('.json')) {
    return 'application/json'
  }
  return 'text/plain'
}

export {}
