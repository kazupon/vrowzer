/**
 * Web Worker core initialization logic for vrowzer preview system.
 *
 * This file provides a factory function `initWebWorker()` that encapsulates
 * the Web Worker setup logic. It accepts an optional `plugins` array to inject
 * user Vite plugins into the dev server.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowzer (which provides resolve.alias for node:* polyfills).
 *
 * @module web-worker-core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

import { createFileSystemSubscriber, createVirtualFSWatcher } from '@vrowzer/fs/watcher'
import { createServer } from '@vrowzer/vite-dev-server/web-worker'

import type { FileSystemSyncMessage } from '@vrowzer/fs/watcher'
import type { CreateServerOptions } from '@vrowzer/vite-dev-server/web-worker'
import type { Plugin, UserConfig } from '@vrowzer/vite-dev-server/vite'

declare const self: DedicatedWorkerGlobalScope

/**
 * Options for initializing the Web Worker.
 * Accepts the full vrowzer.config.ts export (UserConfig with plugins, resolve, etc.).
 * `plugins` are passed to createServer, other fields (resolve.alias, define, etc.)
 * are forwarded as inlineConfig to the WW's internal Vite via V_WW_SETUP.
 */
type InitWebWorkerOptions = UserConfig & { plugins?: Plugin[] }

export async function initWebWorker(options?: InitWebWorkerOptions) {
  // Create watcher early so it can be passed to DevEnvironment via createServer.
  // Subscriber is created later with transformer's fs to share the same vol.
  const watcher = createVirtualFSWatcher()
  let subscriber: ReturnType<typeof createFileSystemSubscriber> | null = null
  const pendingMessages: FileSystemSyncMessage[] = []

  // Separate plugins from other config fields (resolve, define, etc.)
  const { plugins, ...inlineConfig } = options ?? {}

  const serverOptions = {
    watcher: watcher as any,
    ...(plugins ? { plugins } : {}),
    ...(Object.keys(inlineConfig).length > 0 ? { inlineConfig } : {}),
    onUnhandledMessage: async (event: MessageEvent) => {
      // V_FS_* messages: update virtual FS via subscriber
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('V_FS_')) {
        if (subscriber) {
          subscriber.handleMessage(event.data as FileSystemSyncMessage)
        } else {
          pendingMessages.push(event.data as FileSystemSyncMessage)
        }
      }
    }
  } as unknown as CreateServerOptions
  const server = createServer(self, serverOptions)

  // Wait for V_WW_SETUP — loads transformer + DevEnvironment
  await server.listen()

  // Create subscriber with transformer's fs (same vol as DevEnvironment)
  // and the watcher that was already passed to DevEnvironment.
  const { fs: transformerFs } = await import('@vrowzer/vite-dev-server/transformer')
  subscriber = createFileSystemSubscriber(transformerFs, { watcher })

  // Process queued V_FS_* messages
  for (const msg of pendingMessages) {
    subscriber.handleMessage(msg)
  }
  pendingMessages.length = 0
}
