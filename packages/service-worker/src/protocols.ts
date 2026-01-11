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
 * Managed service worker version
 */
export const VROWSER_SW_VERSION = 'VROWSER_SW_VERSION'

/**
 * Whether to skip waiting for `self.skipWaiting()` to be called on the service worker side after installation
 */
export const VROWSER_SW_SKIP_WAITING = 'VROWSER_SW_SKIP_WAITING'

/**
 * Message type constant for circuit breaker operations.
 */
export const VROWSER_SW_SESSION_CIRCUIT_BREAKER = 'VROWSER_SW_SESSION_CIRCUIT_BREAKER'

/**
 * Message type constant for resume operations.
 */
export const VROWSER_SW_SESSION_RESUME = 'VROWSER_SW_SESSION_RESUME'

/**
 * Message type constant for terminated notification (Service Worker -> Page).
 * Sent when the service worker has unregistered itself.
 */
export const VROWSER_SW_SESSION_TERMINATED = 'VROWSER_SW_SESSION_TERMINATED'

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
 * Session response structure
 */
export interface SvcWorkerSessionResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: string
}

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
 * Create a {@link SvcWorkerSessionCloseMessage | service worker 'VROWSER_SW_SESSION_CLOSE' message}
 *
 * @returns The constructed {@link SvcWorkerSessionCloseMessage}
 */
export function createSvcWorkerSessionCloseMessage(): SvcWorkerSessionCloseMessage {
  return { type: VROWSER_SW_SESSION_CLOSE }
}

/**
 * Circuit breaker mode for service worker control.
 *
 * - 'terminate': Unregister the service worker (hard kill)
 * - 'suspend': Disable functionality but keep service worker running (soft kill)
 */
export type CircuitBreakerMode = 'terminate' | 'suspend'

/**
 * Generic session response interface.
 *
 * Used for all session-based request/response patterns including
 * circuit breaker and resume operations.
 *
 * Response matching is done by the `id` field.
 */
export interface SvcWorkerSessionGenericResponse<T = unknown> {
  /**
   * The message type (same as request type)
   */
  type: string
  /**
   * The request ID for response matching
   */
  id: string
  /**
   * Whether the operation succeeded
   */
  success: boolean
  /**
   * Response data if successful
   */
  data?: T
  /**
   * Error message if failed
   */
  error?: string
}

/**
 * Circuit breaker message sent from controller to service worker.
 *
 * Implements the kill switch / circuit breaker pattern for service worker control.
 */
export interface SvcWorkerSessionCircuitBreakerMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_CIRCUIT_BREAKER
  /** Request ID for response matching (auto-generated by session.send()) */
  id: string
  /** The circuit breaker mode */
  mode: CircuitBreakerMode
  /** Whether to clear all caches */
  clearCaches?: boolean
}

/**
 * Result of a circuit breaker operation.
 */
export interface SvcWorkerSessionCircuitBreakerResult {
  /**
   * The mode that was executed
   */
  mode: CircuitBreakerMode
  /**
   * Whether the service worker was terminated (unregistered)
   */
  terminated: boolean
  /**
   *  Names of caches that were cleared
   */
  cachesCleared: string[]
}

/**
 * Resume message sent from controller to service worker.
 *
 * Used to restore functionality after a suspend operation.
 */
export interface SvcWorkerSessionResumeMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_RESUME
  /**
   * Request ID for response matching
   */
  id: string
}

/**
 * Result of a resume operation.
 */
export interface SvcWorkerSessionResumeResult {
  // Empty object - success/error is in the generic response wrapper
  // No additional fields
}

/**
 * Type guard for generic session response
 *
 * Matches any response with id and success fields.
 *
 * @param message - The message to check
 * @returns True if the message is a generic session response
 */
export function isSvcWorkerSessionGenericResponse<T = unknown>(
  message: unknown
): message is SvcWorkerSessionGenericResponse<T> {
  return (
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    typeof (message as SvcWorkerSessionGenericResponse).id === 'string' &&
    'success' in message &&
    typeof (message as SvcWorkerSessionGenericResponse).success === 'boolean'
  )
}

/**
 * Create a circuit breaker response message
 *
 * @param id - The request ID
 * @param success - Whether the operation succeeded
 * @param value - Optional data or error message
 * @returns The constructed circuit breaker response message
 */
export function createSvcWorkerSessionCircuitBreakerResponse<T = unknown>(
  id: string,
  success: boolean,
  value: { data?: T; error?: string } = {}
): SvcWorkerSessionGenericResponse<T> {
  return {
    type: VROWSER_SW_SESSION_CIRCUIT_BREAKER,
    id,
    success,
    ...value
  }
}

/**
 * Type guard for circuit breaker messages
 *
 * @param message - The message to check
 * @returns True if the message is a circuit breaker message
 */
export function isSvcWorkerSessionCircuitBreakerMessage(
  message: unknown
): message is SvcWorkerSessionCircuitBreakerMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as SvcWorkerSessionCircuitBreakerMessage).type === VROWSER_SW_SESSION_CIRCUIT_BREAKER
  )
}

/**
 * Type guard for resume messages.
 *
 * @param message - The message to check
 * @returns True if the message is a resume message
 */
export function isSvcWorkerSessionResumeMessage(
  message: unknown
): message is SvcWorkerSessionResumeMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as SvcWorkerSessionResumeMessage).type === VROWSER_SW_SESSION_RESUME
  )
}

/**
 * Create a resume response message
 *
 * @param id - The request ID
 * @param success - Whether the operation succeeded
 * @param value - Optional data or error message
 * @returns The constructed resume response message
 */
export function createSvcWorkerSessionResumeResponse<T = unknown>(
  id: string,
  success: boolean,
  value: { data?: T; error?: string } = {}
): SvcWorkerSessionGenericResponse<T> {
  return {
    type: VROWSER_SW_SESSION_RESUME,
    id,
    success,
    ...value
  }
}

/**
 * Union type of all messages from Page to Service Worker (via postMessage)
 */
export type SvcWorkerMessage =
  | SvcWorkerVersionMessage
  | SvcWorkerSkipWaitingMessage
  | SvcWorkerSessionInitMessage

/**
 * Reason why the service worker was terminated.
 *
 * - `unregister`: Service worker unregistered itself (e.g., via circuit breaker terminate)
 */
export type SvcWorkerTerminatedReason = 'unregister'

/**
 * Terminated notification message (Service Worker -> Page via session MessagePort)
 */
export interface SvcWorkerSessionTerminatedMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SESSION_TERMINATED
  /**
   * The reason for termination
   */
  reason: SvcWorkerTerminatedReason
}

/**
 * Type guard for {@link SvcWorkerSessionTerminatedMessage}
 *
 * @param message - The message to check
 * @returns True if the message is a SvcWorkerSessionTerminatedMessage
 */
export function isSvcWorkerSessionTerminatedMessage(
  message: unknown
): message is SvcWorkerSessionTerminatedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as SvcWorkerSessionTerminatedMessage).type === VROWSER_SW_SESSION_TERMINATED
  )
}

/**
 * Create a {@link SvcWorkerSessionTerminatedMessage}
 *
 * @param reason - The reason for termination
 * @returns The constructed message
 */
export function createSvcWorkerSessionTerminatedMessage(
  reason: SvcWorkerTerminatedReason
): SvcWorkerSessionTerminatedMessage {
  return { type: VROWSER_SW_SESSION_TERMINATED, reason }
}

/**
 * Union type of all session messages (via session MessagePort)
 */
export type SvcWorkerSessionMessage =
  | SvcWorkerSessionCloseMessage
  | SvcWorkerSessionPingMessage
  | SvcWorkerSessionPongMessage
  | SvcWorkerSessionCircuitBreakerMessage
  | SvcWorkerSessionResumeMessage
  | SvcWorkerSessionTerminatedMessage
