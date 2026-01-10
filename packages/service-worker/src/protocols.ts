/**
 * Service worker message protocols
 *
 * Defines the message protocol between {@link createSvcWorkerController | the service worker controller} and {@link SvcWorker | the service worker}.
 *
 * @module protocols
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Session initialization message
 */
export const VROWSER_SW_SESSION_INIT = 'VROWSER_SW_SESSION_INIT'

/**
 * Session close message
 */
export const VROWSER_SW_SESSION_CLOSE = 'VROWSER_SW_SESSION_CLOSE'

/**
 * Session heartbeat ping message (Service Worker -> Page)
 */
export const VROWSER_SW_SESSION_PING = 'VROWSER_SW_SESSION_PING'

/**
 * Session heartbeat pong response (Page -> Service Worker)
 */
export const VROWSER_SW_SESSION_PONG = 'VROWSER_SW_SESSION_PONG'

/**
 * Session request message (Page -> Service Worker)
 */
export const VROWSER_SW_SESSION_REQUEST = 'VROWSER_SW_SESSION_REQUEST'

/**
 * Managed service worker version
 */
export const VROWSER_SW_VERSION = 'VROWSER_SW_VERSION'

/**
 * Whether to skip waiting for `self.skipWaiting()` to be called on the service worker side after installation
 */
export const VROWSER_SW_SKIP_WAITING = 'VROWSER_SW_SKIP_WAITING'

/**
 * Kill switch to disable the service worker
 */
export const VROWSER_SW_KILL_SWITCH = 'VROWSER_SW_KILL_SWITCH'

/**
 * Base message structure for all protocol messages
 */
export interface SvcWorkerMessageBase {
  type: string
}

/**
 * VERSION request message (Page -> Service Worker)
 */
export interface SvcWorkerVersionMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_VERSION
}

/**
 * VERSION response message (Service Worker -> Page via MessagePort)
 */
export interface SvcWorkerVersionResponse extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_VERSION
  version: string
}

/**
 * SKIP_WAITING message (Page -> Service Worker)
 */
export interface SvcWorkerSkipWaitingMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SKIP_WAITING
}

/**
 * SESSION_INIT message (Page -> Service Worker)
 * Sent with a MessagePort to establish a persistent session
 */
export interface SvcWorkerSessionInitMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_INIT
}

/**
 * SESSION_INIT response (Service Worker -> Page via MessagePort)
 */
export interface SvcWorkerSessionInitResponse {
  type: typeof VROWSER_SW_SESSION_INIT
  success: boolean
  version: string
}

/**
 * SESSION_CLOSE message (Page -> Service Worker via session MessagePort)
 */
export interface SvcWorkerSessionCloseMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_CLOSE
}

/**
 * PING message (Service Worker -> Page via session MessagePort)
 */
export interface SvcWorkerSessionPingMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_PING
  id: string
}

/**
 * PONG response (Page -> Service Worker via session MessagePort)
 */
export interface SvcWorkerSessionPongMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_PONG
  id: string
}

/**
 * Session request message (Page -> Service Worker via session MessagePort)
 */
export interface SvcWorkerSessionRequest extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_REQUEST
  requestType: string
  id: string
  payload?: unknown
}

/**
 * Session response structure
 */
export interface SvcWorkerSessionResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: string
}

/**
 * Session response message (Service Worker -> Page via session MessagePort)
 */
export interface SvcWorkerSessionRequestResponse<T = unknown>
  extends SvcWorkerSessionResponse<T>, SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_REQUEST
}

/**
 * Union type of all messages from Page to Service Worker (via postMessage)
 */
export type SvcWorkerMessage =
  | SvcWorkerVersionMessage
  | SvcWorkerSkipWaitingMessage
  | SvcWorkerSessionInitMessage

/**
 * Union type of all session messages (via session MessagePort)
 */
export type SvcWorkerSessionMessage =
  | SvcWorkerSessionCloseMessage
  | SvcWorkerSessionPingMessage
  | SvcWorkerSessionPongMessage
  | SvcWorkerSessionRequest

/**
 * Create a {@link SvcWorkerVersionMessage | service worker 'VROWSER_SW_VERSION' message}
 *
 * @returns The constructed {@link SvcWorkerVersionMessage}
 */
export function createSvcWorkerVersionMessage(): SvcWorkerVersionMessage {
  return { type: VROWSER_SW_VERSION }
}

/**
 * Type guard for {@link SvcWorkerVersionMessage}
 *
 * @param message - The message to check
 * @returns True if the message is a SvcWorkerVersionMessage, false otherwise
 */
export function isSvcWrokerVersionMessageResponse(
  message: unknown
): message is SvcWorkerVersionResponse {
  return (
    message != null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === VROWSER_SW_VERSION &&
    'version' in message &&
    typeof message.version === 'string'
  )
}

/**
 * Create a {@link SvcWorkerVersionResponse | service worker 'VROWSER_SW_VERSION' response}
 *
 * @param version - The version string of the service worker
 * @returns The constructed {@link SvcWorkerVersionResponse}
 */
export function createSvcWorkerVersionResponse(version: string): SvcWorkerVersionResponse {
  return { type: VROWSER_SW_VERSION, version }
}

/**
 * Create a {@link SvcWorkerSkipWaitingMessage | service worker 'VROWSER_SW_SKIP_WAITING' message}
 *
 * @returns The constructed {@link SvcWorkerSkipWaitingMessage}
 */
export function createSvcWorkerSkipWaitingMessage(): SvcWorkerSkipWaitingMessage {
  return { type: VROWSER_SW_SKIP_WAITING }
}

/**
 * Type guard for {@link SvcWorkerSessionPingMessage}
 *
 * @param message - The message to check
 * @returns True if the message is a SvcWorkerSessionPingMessage, false otherwise
 */
export function isSvcWorkerSessionPingMessage(
  message: unknown
): message is SvcWorkerSessionPingMessage {
  return (
    message != null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === VROWSER_SW_SESSION_PING
  )
}

/**
 * Create a {@link SvcWorkerSessionPingMessage | service worker 'VROWSER_SW_SESSION_PING' message}
 *
 * @param id - The unique ID for the ping message
 * @returns The constructed {@link SvcWorkerSessionPingMessage}
 */
export function createSvcWorkerSessionPingMessage(id: string): SvcWorkerSessionPingMessage {
  return { type: VROWSER_SW_SESSION_PING, id }
}

/**
 * Create a {@link SvcWorkerSessionPongMessage | service worker 'VROWSER_SW_SESSION_PONG' message}
 *
 * @param id - The ID of the PING message to respond to
 * @returns The constructed SvcWorkerSessionPongMessage
 */
export function createSvcWorkerSessionPongMessage(id: string): SvcWorkerSessionPongMessage {
  return { type: VROWSER_SW_SESSION_PONG, id }
}

/**
 * Type guard for {@link SvcWorkerSessionResponse}
 *
 * @param message - The message to check
 * @returns True if the message is a SvcWorkerSessionResponse, false otherwise
 */
export function isSvcWorkerSessionResponse<T>(
  message: unknown
): message is SvcWorkerSessionResponse<T> {
  return message != null && typeof message === 'object' && 'id' in message && 'success' in message
}

/**
 * Create a {@link SvcWorkerSessionInitMessage | service worker 'VROWSER_SW_SESSION_INIT' message}
 *
 * @returns The constructed {@link SvcWorkerSessionInitMessage}
 */
export function createSvcWorkerSessionInitMessage(): SvcWorkerSessionInitMessage {
  return { type: VROWSER_SW_SESSION_INIT }
}

/**
 * Type guard for {@link SvcWorkerSessionInitResponse}
 *
 * @param message - The message to check
 * @returns True if the message is a SvcWorkerSessionInitResponse, false otherwise
 */
export function isSvcWorkerSessionInitResponse(
  message: unknown
): message is SvcWorkerSessionInitResponse {
  return (
    message != null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === VROWSER_SW_SESSION_INIT &&
    'success' in message &&
    'version' in message
  )
}

/**
 * Create a {@link SvcWorkerSessionInitResponse | service worker 'VROWSER_SW_SESSION_INIT' response}
 *
 * @param success - Whether the session initialization was successful
 * @param version - The version of the service worker
 * @returns The constructed {@link SvcWorkerSessionInitResponse}
 */
export function createSvcWorkerSessionInitResponse(
  success: boolean,
  version: string
): SvcWorkerSessionInitResponse {
  return { type: VROWSER_SW_SESSION_INIT, success, version }
}

/**
 * Create a {@link SvcWorkerSessionRequest | service worker 'VROWSER_SW_SESSION_REQUEST' message}
 *
 * @param requestType - The type of the request
 * @param id - The unique ID for the request
 * @param payload - Optionalo payload data
 * @returns The constructed {@link SvcWorkerSessionRequest}
 */
export function createSvcWorkerSessionRequest(
  requestType: string,
  id: string,
  payload?: unknown
): SvcWorkerSessionRequest {
  return {
    type: VROWSER_SW_SESSION_REQUEST,
    requestType,
    id,
    payload
  }
}

/**
 * Create a {@link SvcWorkerSessionRequestResponse | service worker 'VROWSER_SW_SESSION_REQUEST' response}
 *
 * @param value - The response data
 * @returns The constructed {@link SvcWorkerSessionRequestResponse}
 */
export function createSvcWorkerSessionRequestResponse<T = unknown>(
  value: SvcWorkerSessionResponse<T>
): SvcWorkerSessionRequestResponse<T> {
  return {
    type: VROWSER_SW_SESSION_REQUEST,
    ...value
  } as SvcWorkerSessionRequestResponse<T>
}

export function isSvcWorkerSessionRequestResponse<T = unknown>(
  message: unknown
): message is SvcWorkerSessionRequestResponse<T> {
  return (
    message != null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === VROWSER_SW_SESSION_REQUEST &&
    isSvcWorkerSessionResponse<T>(message)
  )
}

/**
 * Create a {@link SvcWorkerSessionCloseMessage | service worker 'VROWSER_SW_SESSION_CLOSE' message}
 *
 * @returns The constructed {@link SvcWorkerSessionCloseMessage}
 */
export function createSvcWorkerSessionCloseMessage(): SvcWorkerSessionCloseMessage {
  return { type: VROWSER_SW_SESSION_CLOSE }
}
