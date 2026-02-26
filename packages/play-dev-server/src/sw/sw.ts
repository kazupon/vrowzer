/// <reference lib="webworker" />

import { fs, vol } from '@vrowser/fs'
import { createFileSystemSubscriber } from '@vrowser/fs/watcher'
import type { FileSystemSyncMessage } from '@vrowser/fs/watcher'
import client from '@vrowser/vite-dev-server/dist/client/client.mjs?raw'
import env from '@vrowser/vite-dev-server/dist/client/env.mjs?raw'
import { createServer, getRequestPath } from '@vrowser/vite-dev-server/service-worker'

import type { MainToServiceWorkerMessage } from '../types.ts'

declare const self: ServiceWorkerGlobalScope

const SW_VERSION = 'play-dev-server-v1'
console.log('[SW] Service Worker loaded, version:', SW_VERSION)

setupVolume(vol)

const subscriber = createFileSystemSubscriber(fs)

const previewBase = '/__preview__/'

// Create Vite Dev Server on Service Worker
const listen = createServer(
  self,
  {
    root: '/',
    server: { middlewareMode: false },
    base: previewBase,
    publicDir: 'public',
    // NOTE(kazupon): disable optimizeDeps for service worker dev server, because vite optimizer is not working well on service worker environment.
    optimizeDeps: {
      disabled: true
    },
    experimental: {
      importGlobRestoreExtension: false,
      renderBuiltUrl: () => undefined,
      hmrPartialAccept: false,
      enableNativePlugin: 'v2',
      bundledDev: false
    },
    plugins: [
      {
        name: 'play-dev-server:middlewares',
        configureServer(server) {
          // pre-hook: registered before transformMiddleware

          // Cross-origin isolation headers for COEP compatibility.
          // The main page sets COEP: require-corp, so all responses (including
          // service worker served iframe content) must include CORP headers.
          server.middlewares.use(async (c, next) => {
            c.header('Cross-Origin-Resource-Policy', 'same-origin')
            c.header('Cross-Origin-Embedder-Policy', 'require-corp')
            c.header('Cross-Origin-Opener-Policy', 'same-origin')
            await next()
          })

          // /hello API endpoint
          server.middlewares.use(async (c, next) => {
            const path = getRequestPath(c)
            if (path.endsWith('/hello')) {
              return c.text('Vite Dev Server on Service Worker says hello!')
            }
            await next()
          })
        }
      }
    ]
  },
  {
    version: SW_VERSION,
    basePath: previewBase,
    // Use subscriber's VirtualFSWatcher as the watcher
    // VirtualFSWatcher is structurally compatible with FSWatcher (FSWatcher extends VirtualFSWatcher)
    watcherFactory: () => subscriber.watcher as any
  }
)

function setupVolume(vol: typeof import('@vrowser/fs').vol) {
  vol.fromJSON({
    '/src/index.ts': 'export const hello = "world"',
    '/src/utils.ts': 'export function add(a, b) { return a + b }',
    '/dist/client/client.mjs': client,
    '/dist/client/env.mjs': env
  })

  fs.mkdirSync('/public', { recursive: true })
  fs.writeFileSync('/public/.gitkeep', 'f', { encoding: 'utf8' })
  fs.writeFileSync(
    '/index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <div id="app"><p>Loading...</p></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
    { encoding: 'utf8' }
  )
  console.log(
    '[SW] Virtual file system initialized.',
    fs.readdirSync('/'),
    fs.existsSync('/public')
  )
}

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

  // V_FS_* messages: update virtual FS via subscriber
  if (typeof message?.type === 'string' && message.type.startsWith('V_FS_')) {
    subscriber.handleMessage(event.data as FileSystemSyncMessage)
    return
  }
})

/**
 * Service Worker Activate Event - Wait for server to be ready
 */
self.addEventListener('activate', _event => {
  console.log('[SW] Activating...')
  _event.waitUntil(
    (async () => {
      try {
        await listen()
        await self.clients.claim()
        console.log('[SW] Activated and claimed clients')
      } catch (e) {
        console.error('[SW] Failed to start Vite Dev Server:', e)
        throw e
      }
    })()
  )
})

export {}
