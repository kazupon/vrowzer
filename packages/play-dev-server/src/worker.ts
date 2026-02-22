/// <reference lib="webworker" />

// Import from lightweight entry (no rolldown WASM, no top-level await)
import { createServer } from '@vrowser/vite-dev-server/web-worker'

import type { BundleResultMessage, MainToWorkerMessage } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

console.log('[Rolldown Worker] initialized')

// Create server — registers self.onmessage immediately (lightweight)
// V_WW_SETUP and V_SW_CONNECT_PORT are handled internally by createServer.
// App-specific messages (e.g. 'bundle', 'file-change') are forwarded to onUnhandledMessage.
const server = createServer(self, {
  onUnhandledMessage: async (event: MessageEvent<MainToWorkerMessage>) => {
    switch (event.data.type) {
      case 'file-change': {
        const { path, content } = event.data
        // Use transformer's @vrowser/fs instance (same instance used by DevEnvironment)
        const { updateFile } = await import('@vrowser/vite-dev-server/transformer')
        updateFile(path, content)
        break
      }

      case 'bundle': {
        const { files, input } = event.data
        try {
          // Dynamic import: heavy modules loaded only when needed
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

// Wait for V_WW_SETUP message from Main Thread
// This dynamically loads rolldown + DevEnvironment and initializes everything
await server.listen()
console.log('[Rolldown Worker] server ready')
