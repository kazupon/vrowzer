/// <reference lib="webworker" />

import { createServer } from '@vrowser/vite-dev-server'

import type { Context } from 'hono'
import type { FileChangeMessage, MainToServiceWorkerMessage } from '../types.ts'

declare const self: ServiceWorkerGlobalScope

const SW_VERSION = 'play-dev-server-v1'

console.log('[SW] Service Worker loaded, version:', SW_VERSION)

// Virtual file system
const files = new Map<string, string>()

// /**
//  * Service Worker Install Event - Skip waiting to activate immediately
//  */
// self.addEventListener('install', event => {
//   console.log('[SW] Installing...')
//   event.waitUntil(self.skipWaiting())
// })

/**
 * Create Vite Dev Server on Service Worker
 */
const server = createServer(
  self,
  { root: '/', server: { middlewareMode: false } },
  {
    listen: true,
    version: SW_VERSION,
    configureMiddlewares: middlewares => {
      // Handle /__preview__/* requests from virtual file system
      middlewares.get('/__preview__/*', (c: Context) => {
        const path = c.req.path
        console.log('[SW] Intercepting preview request:', path)

        if (files.has(path)) {
          console.log('[SW] Serving virtual file:', path)
          return c.body(files.get(path)!, 200, {
            'Content-Type': getContentType(path),
            'Cache-Control': 'no-cache'
          })
        }

        return c.text('Not Found', 404)
      })
    }
  }
)

/**
 * Message Handling from Main Thread
 * Note: Protocol messages (V_SW_*) are handled by createSvcWorker internally
 */
self.addEventListener('message', event => {
  const message = event.data as MainToServiceWorkerMessage

  // Skip protocol messages handled by @vrowser/service-worker
  if (typeof message?.type === 'string' && message.type.startsWith('V_SW_')) {
    return
  }

  console.log('[SW] Received message:', message.type)

  switch (message.type) {
    case 'file-change': {
      handleFileChange(message as FileChangeMessage)
      break
    }
  }
})

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
 * Service Worker Activate Event - Wait for server to be ready
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...')
  event.waitUntil(server.ready)
})

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
