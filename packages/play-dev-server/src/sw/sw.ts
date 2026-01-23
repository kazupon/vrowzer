/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

import type { FileChangeMessage, MainToServiceWorkerMessage } from '../types.ts'

const SW_VERSION = 'play-dev-server-v1'

console.log('[SW] Service Worker loaded, version:', SW_VERSION)

// Virtual file system
const files = new Map<string, string>()

/**
 * Service Worker Install Event
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing...')
  event.waitUntil(self.skipWaiting())
})

/**
 * Service Worker Activate Event
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...')
  event.waitUntil(self.clients.claim())
})

/**
 * Message Handling from Main Thread
 */
self.addEventListener('message', event => {
  const message = event.data as MainToServiceWorkerMessage
  console.log('[SW] Received message:', message.type)

  switch (message.type) {
    case 'init': {
      handleInit(event.source as Client)
      break
    }
    case 'file-change': {
      handleFileChange(message as FileChangeMessage)
      break
    }
    default: {
      console.warn('[SW] Unknown message type:', (message as { type: string }).type)
    }
  }
})

/**
 * Handle init message from main thread
 */
function handleInit(client: Client) {
  console.log('[SW] Init from client:', client.id)
  client.postMessage({ type: 'service-worker-ready' })
}

/**
 * Handle file change from editor
 */
function handleFileChange(message: FileChangeMessage) {
  const { path, content } = message
  console.log('[SW] File changed:', path)

  // Update virtual file system
  files.set(path, content)
}

/**
 * Preview path prefix - only requests with this prefix are handled by SW
 */
const PREVIEW_PREFIX = '/__preview__/'

/**
 * Fetch Event - Only intercept preview-related requests
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Only handle requests with /__preview__/ prefix
  // This ensures no conflict with Vite's resources
  if (!url.pathname.startsWith(PREVIEW_PREFIX)) {
    return // Let Vite handle all other requests
  }

  console.log('[SW] Intercepting preview request:', url.pathname)

  // Check if this is a request for our virtual file system
  if (files.has(url.pathname)) {
    console.log('[SW] Serving virtual file:', url.pathname)
    event.respondWith(serveVirtualFile(url.pathname))
    return
  }

  // Return 404 for unknown preview files
  event.respondWith(new Response('Not Found', { status: 404 }))
})

/**
 * Serve file from virtual file system
 */
function serveVirtualFile(pathname: string): Response {
  const content = files.get(pathname)

  if (content) {
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': getContentType(pathname),
        'Cache-Control': 'no-cache'
      }
    })
  }

  return new Response('Not Found', { status: 404 })
}

/**
 * Get content type based on file extension
 */
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
