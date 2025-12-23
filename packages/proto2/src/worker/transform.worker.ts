/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

import { createLogger } from '../logger.ts'

import type {
  MainToWorkerMessage,
  ResolveRequest,
  ResolveResponse,
  ServiceWorkerToWorkerMessage,
  TransformRequest,
  TransformResponse
} from '../messages/types.ts'

const logger = createLogger('worker')

logger.debug('Transform Worker loaded')

// MessagePort for communication with Service Worker
let serviceWorkerPort: MessagePort | null = null

// File contents cache (path -> content)
const fileCache = new Map<string, string>()

let parser: typeof import('oxc-parser')

async function loaddParser() {
  // https://cdn.jsdelivr.net/npm/@oxc-parser/binding-wasm32-wasi/browser-bundle.js
  const url = 'https://cdn.jsdelivr.net/npm/@oxc-parser/binding-wasm32-wasi/browser-bundle.js'
  parser = (await import(/* @vite-ignore */ url)) as typeof import('oxc-parser')
  return parser
}

/**
 * Message Handling from Main Thread
 */
self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const message = event.data
  logger.debug('Message from main:', message.type)

  switch (message.type) {
    case 'connect-service-worker': {
      handleConnectServiceWorker(message.port)
      await loaddParser()
      break
    }
    case 'file-change': {
      handleFileChange(message.file, message.content)
      break
    }
    default: {
      // @ts-expect-error -- FIXME: type
      logger.warn('Unknown message type:', message.type)
    }
  }
}

/**
 * Handle file change message from main thread
 */
function handleFileChange(file: string, content: string) {
  logger.debug('File change:', file)
  fileCache.set(file, content)
}

/**
 * Handle connect to service worker message (MessagePort from main thread)
 */
function handleConnectServiceWorker(port: MessagePort) {
  logger.debug('Connected to Service Worker via MessagePort')
  serviceWorkerPort = port

  // Listen for messages from Service Worker
  serviceWorkerPort.onmessage = handleServiceWorkerMessage
  serviceWorkerPort.start()
}

/**
 * Message Handling from Service Worker
 */
function handleServiceWorkerMessage(event: MessageEvent<ServiceWorkerToWorkerMessage>) {
  const message = event.data
  logger.debug('Message from Service Worker:', message.type)

  switch (message.type) {
    case 'transform': {
      handleTransform(message)
      break
    }
    case 'resolve': {
      handleResolve(message)
      break
    }
    default: {
      logger.warn('Unknown Service Worker message type:', (message as { type: string }).type)
    }
  }
}

/**
 * Handle transform request from Service Worker
 */
function handleTransform(request: TransformRequest) {
  logger.debug('Transform request:', request.url)

  try {
    // Get code from cache if not provided, or use provided code
    const code = request.code || fileCache.get(request.url) || ''

    if (!code) {
      throw new Error(`File not found in cache: ${request.url}`)
    }

    // In a real implementation, this would use @rolldown/browser or similar
    const transformedCode = transformCode(code, request.url)

    const response: TransformResponse = {
      type: 'transform-result',
      id: request.id,
      code: transformedCode,
      deps: extractDeps(code)
    }

    serviceWorkerPort?.postMessage(response)
  } catch (error) {
    const response: TransformResponse = {
      type: 'transform-result',
      id: request.id,
      code: '',
      error: error instanceof Error ? error.message : String(error)
    }

    serviceWorkerPort?.postMessage(response)
  }
}

/**
 * Handle resolve request from Service Worker
 */
function handleResolve(request: ResolveRequest) {
  logger.debug('Resolve request:', request.specifier)

  try {
    // Simple resolution logic
    const resolved = resolveModule(request.specifier, request.importer)

    const response: ResolveResponse = {
      type: 'resolve-result',
      id: request.id,
      resolved
    }

    serviceWorkerPort?.postMessage(response)
  } catch (error) {
    const response: ResolveResponse = {
      type: 'resolve-result',
      id: request.id,
      error: error instanceof Error ? error.message : String(error)
    }

    serviceWorkerPort?.postMessage(response)
  }
}

/**
 * Transform code (placeholder implementation)
 * In a real implementation, this would use @rolldown/browser
 */
function transformCode(code: string, url: string): string {
  logger.debug('Transforming:', url)

  // TODO(kazupon): call plugin containers
  let transformedCode = code
  if (parser) {
    const ast = parser.parseSync('xxx.js', code)
    console.log('parsed', ast)
  }

  // Add HMR runtime wrapper
  const hmrPreamble = `
// HMR Runtime
if (!import.meta.hot) {
  import.meta.hot = {
    accept(cb) {
      console.log('[HMR] accept registered for ${url}')
    },
    dispose(cb) {
      console.log('[HMR] dispose registered for ${url}')
    }
  }
}
`

  return hmrPreamble + '\n' + code
}

/**
 * Extract dependencies from code (placeholder implementation)
 */
function extractDeps(code: string): string[] {
  const deps: string[] = []

  // Simple regex to find imports
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g
  let match

  while ((match = importRegex.exec(code)) !== null) {
    deps.push(match[1])
  }

  return deps
}

/**
 * Resolve module specifier (placeholder implementation)
 */
function resolveModule(specifier: string, importer?: string): string {
  // Simple resolution
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    // Relative import
    if (importer) {
      const base = importer.substring(0, importer.lastIndexOf('/'))
      return new URL(specifier, `file://${base}/`).pathname
    }
    return specifier
  }

  // Bare specifier (npm package)
  return `/node_modules/${specifier}`
}

// Notify main thread that worker is ready on startup
logger.debug('Worker ready')
self.postMessage({ type: 'worker-ready' })

export {}
