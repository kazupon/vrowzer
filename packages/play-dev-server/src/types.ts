/**
 * Message types for communication between Main Thread, Service Worker, Web Worker, and iframe
 */

// Import protocol message types from @vrowser/vite-dev-server (type-only).
// Type-only imports are safe even in worker.ts because they are erased at compile time.
// The union types (MainToWorkerMessage, WorkerToMainMessage, etc.) enable
// discriminated union narrowing on event.data.type without importing constants.
import type {
  ConnectServiceWorkerPortAckMessage,
  ConnectServiceWorkerPortMessage,
  ConnectWebWorkerPortAckMessage,
  ConnectWebWorkerPortMessage,
  SetupWorkerAckMessage,
  SetupWorkerMessage,
  WebWorkerServiceWorkerChannelReadyMessage
} from '@vrowser/vite-dev-server/web-worker'

// Re-export for consumers
export type {
  ConnectServiceWorkerPortAckMessage,
  ConnectServiceWorkerPortMessage,
  ConnectWebWorkerPortAckMessage,
  ConnectWebWorkerPortMessage,
  SetupWorkerAckMessage,
  SetupWorkerMessage,
  WebWorkerServiceWorkerChannelReadyMessage
}

// ---- App-specific message types ----

/**
 * File change notification (Main → SW)
 */
export interface FileChangeMessage {
  type: 'file-change'
  path: string
  content: string
}

/**
 * Main Thread -> Web Worker: Bundle request
 */
export interface BundleRequestMessage {
  type: 'bundle'
  files: Record<string, string>
  input: string
}

/**
 * Web Worker -> Main Thread: Bundle result
 */
export interface BundleResultMessage {
  type: 'bundle-result'
  success: boolean
  code?: string
  fileName?: string
  error?: string
}

// ---- Union types for message routing ----

export type MainToServiceWorkerMessage = FileChangeMessage | ConnectWebWorkerPortMessage

export type ServiceWorkerToMainMessage = ConnectWebWorkerPortAckMessage

export type MainToWorkerMessage =
  | SetupWorkerMessage
  | BundleRequestMessage
  | ConnectServiceWorkerPortMessage

export type WorkerToMainMessage =
  | SetupWorkerAckMessage
  | BundleResultMessage
  | ConnectServiceWorkerPortAckMessage
