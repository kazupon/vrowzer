/**
 * Service Worker entry point for vrowser preview system.
 *
 * This file is NOT bundled by vrowser's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowser (which provides resolve.alias for node:* polyfills).
 * The unplugin-service-worker plugin detects and bundles this file for Service Worker deployment.
 *
 * @module service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

import { fs, vol } from '@vrowser/fs'
import { createFileSystemSubscriber } from '@vrowser/fs/watcher'
import client from '@vrowser/vite-dev-server/dist/client/client.mjs?raw'
import env from '@vrowser/vite-dev-server/dist/client/env.mjs?raw'
import { createServer } from '@vrowser/vite-dev-server/service-worker'

import type { FileSystemSyncMessage } from '@vrowser/fs/watcher'

declare const self: ServiceWorkerGlobalScope

const SW_VERSION = 'vrowser-v1'

// Initial volume setup: client files + public dir
vol.fromJSON({
  '/dist/client/client.mjs': client,
  '/dist/client/env.mjs': env
})
fs.mkdirSync('/public', { recursive: true })
fs.writeFileSync('/public/.gitkeep', '', { encoding: 'utf8' })

const subscriber = createFileSystemSubscriber(fs)
const previewBase = '/__preview__/'

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
  {
    version: SW_VERSION,
    basePath: previewBase,
    watcherFactory: () => subscriber.watcher as any
  }
)

// Message Handling from Main Thread
self.addEventListener('message', event => {
  const message = event.data

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

// Service Worker Activate Event
self.addEventListener('activate', _event => {
  _event.waitUntil(listen())
})

export {}
