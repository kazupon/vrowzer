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
import { V_FS_ACK, createFileSystemSubscriber } from '@vrowzer/fs/watcher'
import client from '@vrowzer/vite-dev-server/dist/client/client.mjs?raw' // oxlint-disable-line import/default -- ignore for raw import
import env from '@vrowzer/vite-dev-server/dist/client/env.mjs?raw'
import { createServer } from '@vrowzer/vite-dev-server/service-worker'
import {
  V_SW_INSTANCE_STARTED,
  V_SW_LISTEN_READY,
  V_SW_LISTEN_READY_PING
} from '@vrowzer/vite-dev-server/messages'
import { resolvePreviewBasePath } from './preview-base.ts'
import { resolveServiceWorkerVersionForWorker } from './service-worker-version.ts'

import type { FSAckMessage, FileSystemSyncMessage } from '@vrowzer/fs/watcher'
import type { CreateServerOptions } from '@vrowzer/vite-dev-server/service-worker'
import type { Plugin } from '@vrowzer/vite-dev-server/vite'

declare const self: ServiceWorkerGlobalScope

/**
 * How long a request within the base path waits for the project files and the Web Worker channel.
 * Same as the default `fileSyncTimeout` of the runtime, which also bounds its recovery after a
 * Service Worker restart.
 */
const PROJECT_WAIT_TIMEOUT = 10_000

function toAckError(error: unknown): NonNullable<FSAckMessage['error']> {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'Error', message: String(error) }
}

export async function initServiceWorker(options?: { plugins?: Plugin[] }) {
  // A new ID each time this script is evaluated. When the browser restarts the Service Worker
  // process, the registration and the controller stay the same, so the runtime tells the instances
  // apart by this ID.
  const instanceId = crypto.randomUUID()

  // Initial volume setup: client files + public dir
  vol.fromJSON({
    '/dist/client/client.mjs': client,
    '/dist/client/env.mjs': env
  })
  fs.mkdirSync('/public', { recursive: true })
  fs.writeFileSync('/public/.gitkeep', '', { encoding: 'utf8' })

  const subscriber = createFileSystemSubscriber(fs)
  const previewBase = resolvePreviewBasePath()
  const serviceWorkerVersion = resolveServiceWorkerVersionForWorker(self.location.href)

  // This instance serves the project only after it has received the project files (V_FS_INIT) and
  // the Web Worker channel. ready() sends both before the preview opens. After a restart, the
  // runtime sends them again, and requests made in the meantime wait for them.
  let filesReceived = false
  let channelReady = false
  let projectReady = false
  let resolveProjectReady!: () => void
  const projectReadyPromise = new Promise<void>(resolve => {
    resolveProjectReady = resolve
  })

  function updateProjectReady(): void {
    if (filesReceived && channelReady && !projectReady) {
      projectReady = true
      resolveProjectReady()
    }
  }

  async function waitForProject(): Promise<Response | undefined> {
    if (projectReady) {
      return undefined
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = await Promise.race([
      projectReadyPromise.then(() => false),
      new Promise<boolean>(resolve => {
        timer = setTimeout(() => resolve(true), PROJECT_WAIT_TIMEOUT)
      })
    ])
    clearTimeout(timer)
    if (!timedOut) {
      return undefined
    }
    return new Response(
      `[Vrowzer] The preview is not ready: the Service Worker did not receive the project within ${PROJECT_WAIT_TIMEOUT}ms.`,
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    )
  }

  /**
   * Applies a file sync message. V_FS_INIT gives this instance the project files.
   */
  function applyFileSyncMessage(message: FileSystemSyncMessage): void {
    subscriber.handleMessage(message)
    if (message.type === 'V_FS_INIT') {
      filesReceived = true
      updateProjectReady()
    }
  }

  const serverOptions = {
    version: serviceWorkerVersion,
    basePath: previewBase,
    ...(options?.plugins ? { plugins: options.plugins } : {}),
    watcherFactory: () => subscriber.watcher as any,
    beforeRequest: waitForProject,
    onWorkerChannelReady: () => {
      channelReady = true
      updateProjectReady()
    }
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
  listenPromise.then(async () => {
    listenReady = true
    // Tell the pages that this instance started. A runtime that knows another instance has lost
    // its project here, and sends the files and the Web Worker channel again.
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) {
      client.postMessage({ type: V_SW_INSTANCE_STARTED, instanceId })
    }
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
          client?.postMessage({ type: V_SW_LISTEN_READY, instanceId })
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
      const syncMessage = message as FileSystemSyncMessage
      const id = syncMessage.type === 'V_FS_MKDIR' ? undefined : syncMessage.id
      if (id === undefined) {
        applyFileSyncMessage(syncMessage)
        return
      }

      // The virtual filesystem is written synchronously, so later requests see the change
      // as soon as handleMessage() returns. Acknowledge it to the client that sent it.
      let ack: FSAckMessage = { type: V_FS_ACK, id }
      try {
        applyFileSyncMessage(syncMessage)
      } catch (error) {
        ack = { type: V_FS_ACK, id, error: toAckError(error) }
      }
      event.source?.postMessage(ack)
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
          client.postMessage({ type: V_SW_LISTEN_READY, instanceId })
        }
      })
    )
  })
}
