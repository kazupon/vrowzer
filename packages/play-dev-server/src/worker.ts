/// <reference lib="webworker" />

// Import from lightweight entry (no rolldown WASM, no top-level await)
import { createFileSystemSubscriber, createVirtualFSWatcher } from '@vrowser/fs/watcher'
import type { FileSystemSyncMessage } from '@vrowser/fs/watcher'
import { createServer } from '@vrowser/vite-dev-server/web-worker'

import type { BundleResultMessage, MainToWorkerMessage } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

console.log('[Rolldown Worker] initialized')

// Create watcher early so it can be passed to DevEnvironment via createServer.
// Subscriber is created later with transformer's fs to share the same vol.
const watcher = createVirtualFSWatcher()
let subscriber: ReturnType<typeof createFileSystemSubscriber> | null = null
const pendingMessages: FileSystemSyncMessage[] = []

const server = createServer(self, {
  watcher: watcher as any,
  onUnhandledMessage: async (event: MessageEvent<MainToWorkerMessage>) => {
    if (typeof event.data?.type === 'string' && event.data.type.startsWith('V_FS_')) {
      if (subscriber) {
        subscriber.handleMessage(event.data as FileSystemSyncMessage)
      } else {
        pendingMessages.push(event.data as FileSystemSyncMessage)
      }
      return
    }

    switch (event.data.type) {
      case 'bundle': {
        const { files, input } = event.data
        try {
          const { bundle } = await import('@vrowser/vite-dev-server/transformer')
          const [code, fileName] = await bundle(files, input)
          const result: BundleResultMessage = {
            type: 'bundle-result',
            success: true,
            code,
            fileName
          }
          console.log('[Rolldown Worker] bundle result:', result)
          self.postMessage(result)
        } catch (error) {
          const result: BundleResultMessage = {
            type: 'bundle-result',
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
          self.postMessage(result)
        }
        break
      }
    }
  }
})

// Wait for V_WW_SETUP — loads transformer + DevEnvironment
await server.listen()
console.log('[Rolldown Worker] server ready')

// Create subscriber with transformer's fs (same vol as DevEnvironment)
// and the watcher that was already passed to DevEnvironment.
const { fs: transformerFs } = await import('@vrowser/vite-dev-server/transformer')
subscriber = createFileSystemSubscriber(transformerFs, { watcher })

// Process queued V_FS_* messages
for (const msg of pendingMessages) {
  subscriber.handleMessage(msg)
}
pendingMessages.length = 0
