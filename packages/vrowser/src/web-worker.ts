/**
 * Web Worker entry point for vrowser preview system.
 *
 * This file is NOT bundled by vrowser's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowser (which provides resolve.alias for node:* polyfills).
 *
 * @module web-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

import { createFileSystemSubscriber, createVirtualFSWatcher } from '@vrowser/fs/watcher'
import { createServer } from '@vrowser/vite-dev-server/web-worker'

import type { FileSystemSyncMessage } from '@vrowser/fs/watcher'

declare const self: DedicatedWorkerGlobalScope

// Create watcher early so it can be passed to DevEnvironment via createServer.
// Subscriber is created later with transformer's fs to share the same vol.
const watcher = createVirtualFSWatcher()
let subscriber: ReturnType<typeof createFileSystemSubscriber> | null = null
const pendingMessages: FileSystemSyncMessage[] = []

const server = createServer(self, {
  watcher: watcher as any,
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
})

// Wait for V_WW_SETUP — loads transformer + DevEnvironment
await server.listen()

// Create subscriber with transformer's fs (same vol as DevEnvironment)
// and the watcher that was already passed to DevEnvironment.
const { fs: transformerFs } = await import('@vrowser/vite-dev-server/transformer')
subscriber = createFileSystemSubscriber(transformerFs, { watcher })

// Process queued V_FS_* messages
for (const msg of pendingMessages) {
  subscriber.handleMessage(msg)
}
pendingMessages.length = 0
