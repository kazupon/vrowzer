/// <reference lib="webworker" />

import { fs, vol, watch } from '@vrowser/fs'
import client from '@vrowser/vite-dev-server/dist/client/client.mjs?raw'
import env from '@vrowser/vite-dev-server/dist/client/env.mjs?raw'
import { createServer, getRequestPath } from '@vrowser/vite-dev-server/service-worker'

import type { FileChangeMessage, MainToServiceWorkerMessage } from '../types.ts'

declare const self: ServiceWorkerGlobalScope

const SW_VERSION = 'play-dev-server-v1'
console.log('[SW] Service Worker loaded, version:', SW_VERSION)

setupVolume(vol)

// self.addEventListener('install', event => {
//   console.log('[SW] Installing...')
//   event.waitUntil(self.skipWaiting())
// })

const previewBase = '/__preview__/'

// Create Vite Dev Server on Service Worker
const listenableServer = createServer(
  self,
  {
    root: '/',
    server: { middlewareMode: false },
    base: previewBase,
    publicDir: 'public',
    // NOTE(kazupon): disable optimizeDeps for sw dev server, because vite optimizer is not working well on service worker environment.
    optimizeDeps: {
      disabled: true
    },
    experimental: {
      importGlobRestoreExtension: false,
      renderBuiltUrl: () => undefined,
      hmrPartialAccept: false,
      enableNativePlugin: 'v2',
      bundledDev: false
    }
  },
  {
    version: SW_VERSION,
    basePath: previewBase,
    // @ts-expect-error -- FIXME
    watcherFactory: (targets: string[], options) => {
      console.log('[SW] Creating FSWatcher :', targets, options)
      const first = targets.pop()
      if (!first) {
        throw new Error('No watch targets specified')
      }
      const watcher = watch(first, options)
      console.log('[SW] FSWatcher created.', watcher)
      for (const _target of targets) {
        // TODO:
      }
      return watcher
    }
  }
)

// Add cross-origin isolation headers for COEP compatibility.
// The main page sets COEP: require-corp, so all responses (including
// SW-served iframe content) must include CORP headers.
// COEP on the iframe response is also needed to enable cross-origin
// isolation within the iframe context.
listenableServer.middlewares.push(async (c, next) => {
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  c.header('Cross-Origin-Embedder-Policy', 'require-corp')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  await next()
})

listenableServer.middlewares.push(async (c, next) => {
  const path = getRequestPath(c)
  console.log('[SW] Received request for /hello', c.req.url, path)
  if (path.endsWith('/hello')) {
    return c.text('Vite Dev Server on Service Worker says hello!')
  }
  await next()
})

listenableServer.middlewares.push(async (c, next) => {
  const path = getRequestPath(c)
  console.log('[SW] Received request for ./fs', c.req.url, path, getContentType)

  // Let indexHtmlMiddleware handle HTML; let htmlFallbackMiddleware handle dirs
  // if (path.endsWith('.html') || path.endsWith('/')) {
  //   await next()
  //   return
  // }

  // if (fs.existsSync(path) && fs.statSync(path).isFile()) {
  //   const content = fs.readFileSync(path, 'utf8') as string
  //   return c.body(content, 200, {
  //     'Content-Type': getContentType(path),
  //     'Cache-Control': 'no-cache'
  //   })
  // }

  await next()
})

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

  // Change working directory
  // chdir('/src')
  // console.log('cwd()', cwd()) // '/src'
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
  fs.writeFileSync(path, content, { encoding: 'utf8' })
  console.log('[SW] File updated in virtual FS:', vol.toTree())
}

/**
 * Service Worker Activate Event - Wait for server to be ready
 */
self.addEventListener('activate', _event => {
  console.log('[SW] Activating...')
  _event.waitUntil(
    (async () => {
      try {
        await listenableServer.listen()
        await self.clients.claim()
        console.log('[SW] Activated and claimed clients')
      } catch (e) {
        console.error('[SW] Failed to start Vite Dev Server:', e)
        throw e
      }
    })()
  )
})

/**
 * Get content type based on file extension
 */
function getContentType(pathname: string): string {
  console.log('[SW] Getting content type for:', pathname)
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
