/**
 * Message types for communication between Main Thread, Service Worker, and iframe
 */

/**
 * File change notification
 */
export interface FileChangeMessage {
  type: 'file-change'
  path: string
  content: string
}

/**
 * Main Thread -> Service Worker: Initialize connection
 */
export interface InitMessage {
  type: 'init'
}

/**
 * Service Worker -> Main Thread: Ready notification
 */
export interface ServiceWorkerReadyMessage {
  type: 'service-worker-ready'
}

/**
 * Service Worker -> iframe: Full reload
 */
export interface FullReloadMessage {
  type: 'full-reload'
}

/**
 * Union types for message routing
 */
export type MainToServiceWorkerMessage = InitMessage | FileChangeMessage
export type ServiceWorkerToMainMessage = ServiceWorkerReadyMessage
export type ServiceWorkerToIframeMessage = FullReloadMessage
