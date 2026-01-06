/**
 * Message types for communication between Main Thread, Service Worker, Web Worker, and iframe
 */

// =============================================================================
// Main Thread <-> Service Worker
// Main Thread <-> Web Worker
// =============================================================================

/**
 * File change notification
 */
export interface FileChangeMessage {
  type: 'file-change'
  file: string
  content: string
}

// =============================================================================
// Main Thread <-> Service Worker
// =============================================================================

/**
 * Main Thread -> Service Worker: Initialize connection
 */
interface InitMessage {
  type: 'init'
}

/**
 * Main Thread -> Service Worker: Connect with Web Worker
 */
interface ConnectWorkerToServiceWorkerMessage {
  type: 'connect-worker'
  port: MessagePort
}

/**
 * Main Thread -> Service Worker: Connect with iframe
 */
interface ConnectIframeToServiceWorkerMessage {
  type: 'connect-iframe'
  port: MessagePort
}

/**
 * Service Worker -> Main Thread: Ready notification
 */
interface ServiceWorkerReadyMessage {
  type: 'service-worker-ready'
}

// =============================================================================
// Main Thread <-> Web Worker
// =============================================================================

/**
 * Main Thread -> Web Worker: Connect with port
 */
interface ConnectWorkerMessage {
  type: 'connect-service-worker'
  port: MessagePort
}

/**
 * Web Worker -> Main Thread: Ready notification
 */
interface WorkerReadyMessage {
  type: 'worker-ready'
}

// =============================================================================
// Service Worker <-> Web Worker
// =============================================================================

/**
 * Service Worker -> Web Worker: Transform request
 */
export interface TransformRequest {
  type: 'transform'
  id: string
  url: string
  code: string
}

/**
 * Web Worker -> Service Worker: Transform response
 */
export interface TransformResponse {
  type: 'transform-result'
  id: string
  code: string
  map?: unknown
  deps?: string[]
  error?: string
}

/**
 * Service Worker -> Web Worker: Resolve request
 */
export interface ResolveRequest {
  type: 'resolve'
  id: string
  specifier: string
  importer?: string
}

/**
 * Web Worker -> Service Worker: Resolve response
 */
export interface ResolveResponse {
  type: 'resolve-result'
  id: string
  resolved?: string
  error?: string
}

// =============================================================================
// Main Thread <-> iframe
// =============================================================================

/**
 * Main Thread -> iframe: Connect with Service Worker
 */
interface ConnectServiceWorkerToIframeMessage {
  type: 'connect-service-worker'
  port: MessagePort
}

/**
 * iframe -> Main Thread: HMR client ready
 */
interface IframeReadyMessage {
  type: 'hmr-client-ready'
}

/**
 * iframe -> Main Thread: Success notification
 */
interface IframeSuccessMessage {
  type: 'success'
}

/**
 * iframe -> Main Thread: Error notification
 */
interface IframeErrorMessage {
  type: 'error'
  message: string
}

// =============================================================================
// iframe <-> Service Worker
// =============================================================================

/**
 * Service Worker -> iframe: HMR update notification
 */
interface HMRUpdateMessage {
  type: 'hmr-update'
  updates: HMRUpdate[]
}

/**
 * Service Worker -> iframe: HMR update details
 */
interface HMRUpdate {
  type: 'js-update' | 'css-update'
  path: string
  acceptedPath: string
  timestamp: number
}

/**
 * iframe -> Service Worker: HMR client ready
 */
interface HMRClientReadyMessage {
  type: 'hmr-client-ready'
}

/**
 * Service Worker -> iframe: Full reload
 */
interface HMRFullReloadMessage {
  type: 'hmr-full-reload'
  path?: string
}

type MainToServiceWorkerMessage =
  | FileChangeMessage
  | InitMessage
  | ConnectWorkerToServiceWorkerMessage
  | ConnectIframeToServiceWorkerMessage
export type ServiceWorkerToMainMessage = ServiceWorkerReadyMessage
export type MainToWorkerMessage = ConnectWorkerMessage | FileChangeMessage
export type WorkerToMainMessage = WorkerReadyMessage
type MainToIframeMessage = ConnectServiceWorkerToIframeMessage
type IframeToMainMessage = IframeReadyMessage | IframeSuccessMessage | IframeErrorMessage
export type ServiceWorkerToWorkerMessage = TransformRequest | ResolveRequest
type WorkerToServiceWorkerMessage = TransformResponse | ResolveResponse
type ServiceWorkerToIframeMessage = HMRUpdateMessage | HMRFullReloadMessage
type IframeToServiceWorkerMessage = HMRClientReadyMessage
