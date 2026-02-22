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
 * Main Thread → Web Worker: Initialize worker with config.
 * Sent after `new Worker()` to trigger `setupWorker()`.
 */
export interface SetupWorkerMessage {
  type: 'V_WW_SETUP'
  config: Record<string, unknown>
  options?: Record<string, unknown>
  /**
   * Initial files to populate the virtual filesystem (@vrowser/fs).
   * Keys are absolute paths (e.g. '/main.js'), values are file contents.
   */
  files?: Record<string, string>
}

/**
 * Web Worker → Main Thread: Worker initialization complete (ACK).
 * Sent after `setupWorker()` completes successfully.
 */
export interface SetupWorkerAckMessage {
  type: 'V_WW_SETUP_ACK'
}

// ---- Service Worker ↔ Web Worker MessageChannel connection protocol ----

/**
 * Main Thread → Service Worker: Accept a MessagePort for Web Worker communication.
 * The port is transferred via postMessage's transfer list.
 * Service Worker receives this via SvcWorkerServer's `connection` event.
 */
export interface ConnectWebWorkerPortMessage {
  type: 'V_WW_CONNECT_PORT'
}

/**
 * Main Thread → Web Worker: Accept a MessagePort for Service Worker communication.
 * The port is transferred via postMessage's transfer list.
 */
export interface ConnectServiceWorkerPortMessage {
  type: 'V_SW_CONNECT_PORT'
}

/**
 * Service Worker ↔ Web Worker: Channel establishment confirmation (sent over the MessagePort).
 * Both sides send this to confirm the port is ready.
 * After both sides receive this, the port is switched to birpc.
 */
export interface WebWorkerServiceWorkerChannelReadyMessage {
  type: 'V_WW_SW_CHANNEL_READY'
  source: 'sw' | 'ww'
}

/**
 * Service Worker → Main Thread: Service Worker completed channel-ready handshake with Web Worker.
 * Sent via `clients.get(clientId).postMessage()` to the originating client only.
 */
export interface ConnectWebWorkerPortAckMessage {
  type: 'V_WW_CONNECT_PORT_ACK'
}

/**
 * Web Worker → Main Thread: Web Worker completed channel-ready handshake with Service Worker.
 * Sent via `self.postMessage()`.
 */
export interface ConnectServiceWorkerPortAckMessage {
  type: 'V_SW_CONNECT_PORT_ACK'
}

// ---- Protocol message type constants ----

export const V_WW_SETUP = 'V_WW_SETUP' as const
export const V_WW_SETUP_ACK = 'V_WW_SETUP_ACK' as const
export const V_WW_CONNECT_PORT = 'V_WW_CONNECT_PORT' as const
export const V_SW_CONNECT_PORT = 'V_SW_CONNECT_PORT' as const
export const V_WW_SW_CHANNEL_READY = 'V_WW_SW_CHANNEL_READY' as const
export const V_WW_CONNECT_PORT_ACK = 'V_WW_CONNECT_PORT_ACK' as const
export const V_SW_CONNECT_PORT_ACK = 'V_SW_CONNECT_PORT_ACK' as const
