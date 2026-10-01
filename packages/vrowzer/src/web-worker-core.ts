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

import { V_FS_ACK, createFileSystemSubscriber, createVirtualFSWatcher } from '@vrowzer/fs/watcher'
import { createServer } from '@vrowzer/vite-dev-server/web-worker'

import type { FSAckMessage, FileSystemSubscriber, FileSystemSyncMessage } from '@vrowzer/fs/watcher'
import type {
  CreateServerOptions,
  ViteDevServerForWorker
} from '@vrowzer/vite-dev-server/web-worker'
import type { Plugin, UserConfig } from '@vrowzer/vite-dev-server/vite'

declare const self: DedicatedWorkerGlobalScope

/**
 * Options for initializing the Web Worker.
 * Accepts the full vrowzer.config.ts export (UserConfig with plugins, resolve, etc.).
 * `plugins` are passed to createServer, other fields (resolve.alias, define, etc.)
 * are forwarded as inlineConfig to the WW's internal Vite via V_WW_SETUP.
 */
type InitWebWorkerOptions = UserConfig & { plugins?: Plugin[] }

function toAckError(error: unknown): NonNullable<FSAckMessage['error']> {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'Error', message: String(error) }
}

/**
 * Applies a V_FS_* message. A write or deletion with an `id` is acknowledged after the dev server
 * has processed the file change up to module graph invalidation, so that later transform
 * requests see it. HMR is not awaited.
 */
function applyMessage(
  subscriber: FileSystemSubscriber,
  server: ViteDevServerForWorker,
  message: FileSystemSyncMessage
): void {
  const fileChange =
    message.type === 'V_FS_WRITE' || message.type === 'V_FS_UNLINK' ? message : undefined
  const id = fileChange?.id
  let applied: Promise<void>
  try {
    subscriber.handleMessage(message)
    // handleMessage() emits the watcher event synchronously, so its processing is taken right
    // away, even without an id, so that it is not left behind for a later message
    applied = fileChange ? server.waitForFileChange(fileChange.path) : Promise.resolve()
  } catch (error) {
    if (id === undefined) {
      throw error
    }
    applied = Promise.reject(error)
  }

  if (id !== undefined) {
    void applied.then(
      () => {
        self.postMessage({ type: V_FS_ACK, id } satisfies FSAckMessage)
      },
      (error: unknown) => {
        self.postMessage({ type: V_FS_ACK, id, error: toAckError(error) } satisfies FSAckMessage)
      }
    )
  }
}

export async function initWebWorker(options?: InitWebWorkerOptions) {
  // Create watcher early so it can be passed to DevEnvironment via createServer.
  // Subscriber is created later with transformer's fs to share the same vol.
  const watcher = createVirtualFSWatcher()
  let apply: ((message: FileSystemSyncMessage) => void) | null = null
  const pendingMessages: FileSystemSyncMessage[] = []

  // Separate plugins from other config fields (resolve, define, etc.)
  const { plugins, ...inlineConfig } = options ?? {}

  const serverOptions = {
    watcher: watcher as any,
    protectRuntimeConfig: true,
    ...(plugins ? { plugins } : {}),
    ...(Object.keys(inlineConfig).length > 0 ? { inlineConfig } : {}),
    onUnhandledMessage: async (event: MessageEvent) => {
      // V_FS_* messages: update virtual FS via subscriber
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('V_FS_')) {
        if (apply) {
          apply(event.data as FileSystemSyncMessage)
        } else {
          pendingMessages.push(event.data as FileSystemSyncMessage)
        }
      }
    }
  } as unknown as CreateServerOptions
  const server = createServer(self, serverOptions)

  // Wait for V_WW_SETUP — loads transformer + DevEnvironment
  const readyServer = await server.listen(0)

  // Create subscriber with the exact fs used by the DevEnvironment.
  // and the watcher that was already passed to DevEnvironment.
  const subscriber = createFileSystemSubscriber(readyServer.fileSystem, { watcher })
  apply = message => applyMessage(subscriber, readyServer, message)

  // Process queued V_FS_* messages
  for (const msg of pendingMessages) {
    apply(msg)
  }
  pendingMessages.length = 0
}
