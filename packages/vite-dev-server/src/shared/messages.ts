/**
 * Protocol message types for Service Worker ↔ Web Worker communication
 *
 * These types define the message protocol used to establish and manage
 * the MessageChannel connection between Service Worker and Web Worker.
 * They are used by both @vrowser/vite-dev-server/service-worker and
 * @vrowser/vite-dev-server/web-worker, as well as the consumer
 * (play-dev-server) that orchestrates the connection.
 *
 * @module shared/messages
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// ---- Web Worker setup protocol ----

/**
 * Web Worker -> Main Thread: Worker's `self.onmessage` is registered and ready to receive messages.
 * Sent immediately after `createServer()` registers its message handler.
 *
 * Without this handshake, a race condition can occur: if the Web Worker module evaluation
 * takes time (e.g. loading WASM via user plugins that import from "vite"),
 * Main Thread may send `V_WW_SETUP` before `onmessage` is set, causing the message to be lost.
 */
export interface WorkerReadyMessage {
  type: 'V_WW_READY'
}

/**
 * Main Thread -> Web Worker: Initialize worker with config.
 * Sent after receiving `V_WW_READY` to trigger `setupWorker()`.
 */
export interface SetupWorkerMessage {
  type: 'V_WW_SETUP'
  /**
   * Vite config object. Contents depend on the consumer's needs.
   */
  config: Record<string, unknown>
  /**
   * Initialize web worker
   */
  options?: Record<string, unknown>
  /**
   * Initial files to populate the virtual filesystem (@vrowser/fs).
   * Keys are absolute paths (e.g. '/main.js'), values are file contents.
   */
  files?: Record<string, string>
}

/**
 * Web Worker -> Main Thread: Worker initialization complete (ACK).
 * Sent after `setupWorker()` completes successfully.
 */
export interface SetupWorkerAckMessage {
  type: 'V_WW_SETUP_ACK'
}

/**
 * Web Worker -> Main Thread: Worker initialization failed.
 * Sent when `setupWorker()` throws an error.
 * Allows Main Thread to fail fast instead of waiting for timeout.
 */
export interface SetupWorkerErrorMessage {
  type: 'V_WW_SETUP_ERROR'
  error: {
    message: string
    stack?: string
  }
}

// ---- Service Worker <-> Web Worker MessageChannel connection protocol ----

/**
 * Main Thread -> Service Worker: Accept a MessagePort for Web Worker communication.
 * The port is transferred via postMessage's transfer list.
 * Service Worker receives this via SvcWorkerServer's `connection` event.
 */
export interface ConnectWebWorkerPortMessage {
  type: 'V_WW_CONNECT_PORT'
}

/**
 * Main Thread -> Web Worker: Accept a MessagePort for Service Worker communication.
 * The port is transferred via postMessage's transfer list.
 */
export interface ConnectServiceWorkerPortMessage {
  type: 'V_SW_CONNECT_PORT'
}

/**
 * Service Worker <-> Web Worker: Channel establishment confirmation (sent over the MessagePort).
 * Both sides send this to confirm the port is ready.
 * After both sides receive this, the port is switched to birpc.
 */
export interface WebWorkerServiceWorkerChannelReadyMessage {
  type: 'V_WW_SW_CHANNEL_READY'
  /**
   * Source of the message, 'sw' (Service Worker) or 'ww' (Web Worker)
   */
  source: 'sw' | 'ww'
}

/**
 * Service Worker -> Main Thread: Service Worker completed channel-ready handshake with Web Worker.
 * Sent via `clients.get(clientId).postMessage()` to the originating client only.
 */
export interface ConnectWebWorkerPortAckMessage {
  type: 'V_WW_CONNECT_PORT_ACK'
}

/**
 * Web Worker -> Main Thread: Web Worker completed channel-ready handshake with Service Worker.
 * Sent via `self.postMessage()`.
 */
export interface ConnectServiceWorkerPortAckMessage {
  type: 'V_SW_CONNECT_PORT_ACK'
}

/**
 * iframe -> Service Worker -> Web Worker (via Service Worker <-> Web Worker MessagePort):
 * Forward iframe's HMR MessagePort to Web Worker.
 * The port is transferred via postMessage's transfer list.
 */
export interface WebWorkerHmrPortMessage {
  type: 'V_WW_HMR_PORT'
  /**
   * Client ID of the iframe sending the HMR (via 'vite:mc:init' message)
   */
  clientId?: string
}

/**
 * iframe -> Web Worker: Initialize HMR MessagePort connection.
 */
export interface ViteMessageChannelInitMessage {
  type: 'vite:mc:init'
  /**
   * Client ID of the iframe sending the HMR
   */
  clientId?: string
}

// ---- Service Worker listen readiness protocol ----

/**
 * Main Thread -> Service Worker: Poll whether the Service Worker's `listen()` has completed.
 * Sent at intervals until `V_SW_LISTEN_READY` is received.
 */
export interface ServiceWorkerListenReadyPingMessage {
  type: 'V_SW_LISTEN_READY_PING'
}

/**
 * Service Worker -> Main Thread: Service Worker's `listen()` has completed
 * and it is ready to accept MessageChannel connections.
 * Sent in response to `V_SW_LISTEN_READY_PING` (after listen is done),
 * and also broadcast to all clients on activation.
 */
export interface ServiceWorkerListenReadyMessage {
  type: 'V_SW_LISTEN_READY'
}

// ---- Protocol message type constants ----

export const V_WW_READY = 'V_WW_READY' as const
export const V_WW_SETUP = 'V_WW_SETUP' as const
export const V_WW_SETUP_ACK = 'V_WW_SETUP_ACK' as const
export const V_WW_SETUP_ERROR = 'V_WW_SETUP_ERROR' as const
export const V_WW_CONNECT_PORT = 'V_WW_CONNECT_PORT' as const
export const V_SW_CONNECT_PORT = 'V_SW_CONNECT_PORT' as const
export const V_WW_SW_CHANNEL_READY = 'V_WW_SW_CHANNEL_READY' as const
export const V_WW_CONNECT_PORT_ACK = 'V_WW_CONNECT_PORT_ACK' as const
export const V_SW_CONNECT_PORT_ACK = 'V_SW_CONNECT_PORT_ACK' as const
export const V_WW_HMR_PORT = 'V_WW_HMR_PORT' as const
export const V_SW_LISTEN_READY_PING = 'V_SW_LISTEN_READY_PING' as const
export const V_SW_LISTEN_READY = 'V_SW_LISTEN_READY' as const
export const MC_INIT_EVENT = 'vite:mc:init' as const
