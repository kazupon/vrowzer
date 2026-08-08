/**
 * Service Worker core initialization logic for vrowzer preview system.
 *
 * This file provides a factory function `initServiceWorker()` that encapsulates
 * the Service Worker setup logic. It accepts an optional `plugins` array to inject
 * user Vite plugins into the dev server.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowzer (which provides resolve.alias for node:* polyfills).
 * The unplugin-service-worker plugin detects and bundles this file for Service Worker deployment.
 *
 * @module service-worker-core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

import { fs, vol } from '@vrowzer/fs'
import { createFileSystemSubscriber } from '@vrowzer/fs/watcher'
import client from '@vrowzer/vite-dev-server/dist/client/client.mjs?raw' // oxlint-disable-line import/default -- ignore for raw import
import env from '@vrowzer/vite-dev-server/dist/client/env.mjs?raw'
import { createServer } from '@vrowzer/vite-dev-server/service-worker'
import { V_SW_LISTEN_READY, V_SW_LISTEN_READY_PING } from '@vrowzer/vite-dev-server/messages'

import type { FileSystemSyncMessage } from '@vrowzer/fs/watcher'
import type { CreateServerOptions } from '@vrowzer/vite-dev-server/service-worker'
import type { Plugin } from '@vrowzer/vite-dev-server/vite'

declare const self: ServiceWorkerGlobalScope

const SW_VERSION = 'vrowzer-v1'

export async function initServiceWorker(options?: { plugins?: Plugin[] }) {
  // Initial volume setup: client files + public dir
  vol.fromJSON({
    '/dist/client/client.mjs': client,
    '/dist/client/env.mjs': env
  })
  fs.mkdirSync('/public', { recursive: true })
  fs.writeFileSync('/public/.gitkeep', '', { encoding: 'utf8' })

  const subscriber = createFileSystemSubscriber(fs)
  const previewBase = '/__preview__/'
  const serverOptions = {
    version: SW_VERSION,
    basePath: previewBase,
    ...(options?.plugins ? { plugins: options.plugins } : {}),
    watcherFactory: () => subscriber.watcher as any
  } as unknown as CreateServerOptions

  const listen = createServer(
    self,
    {
      root: '/',
      server: { middlewareMode: false },
      base: previewBase,
      publicDir: 'public',
      optimizeDeps: { disabled: true },
      experimental: {
        importGlobRestoreExtension: false,
        renderBuiltUrl: () => undefined,
        hmrPartialAccept: false,
        enableNativePlugin: 'v2',
        bundledDev: false
      }
    },
    serverOptions
  )

  // Start the Vite dev server at the top level (not inside activate event).
  // SW processes are ephemeral — the browser can terminate and restart them at any time.
  // The activate event only fires once during the SW lifecycle, so if the process restarts,
  // listen() would never be called again. By calling it at the top level, it runs
  // every time the SW script loads, ensuring the server is always initialized.
  const listenPromise = listen()
  let listenReady = false
  // oxlint-disable-next-line typescript/no-floating-promises -- ignore for service worker timing
  listenPromise.then(() => {
    listenReady = true
  })

  // Message Handling from Main Thread
  self.addEventListener('message', event => {
    const message = event.data

    // Respond to listen-ready ping from main thread
    if (message?.type === V_SW_LISTEN_READY_PING && listenReady) {
      const clientId = (event.source as Client | null)?.id
      if (clientId) {
        // oxlint-disable-next-line typescript/no-floating-promises -- ignore for vrowzer preview system negotiation timing
        self.clients.get(clientId).then(client => {
          client?.postMessage({ type: V_SW_LISTEN_READY })
        })
      }
      return
    }

    // Skip protocol messages handled by @vrowzer/service-worker
    if (typeof message?.type === 'string' && message.type.startsWith('V_SW_')) {
      return
    }

    // V_FS_* messages: update virtual FS via subscriber
    if (typeof message?.type === 'string' && message.type.startsWith('V_FS_')) {
      subscriber.handleMessage(event.data as FileSystemSyncMessage)
      return
    }
  })

  // Service Worker Activate Event
  // NOTE(kazupon): clients.claim() is handled by createSvcWorker (inside createSvcWorkerServer)
  // via V_SW_CLAIM_CLIENTS message from controller.ready({ waitForController: true }).
  // listen() is called at top level, so we just wait for it here to keep the SW alive.
  self.addEventListener('activate', _event => {
    _event.waitUntil(
      listenPromise.then(async () => {
        // Signal main thread that the server is ready
        const clients = await self.clients.matchAll({ includeUncontrolled: true })
        for (const client of clients) {
          client.postMessage({ type: V_SW_LISTEN_READY })
        }
      })
    )
  })
}
