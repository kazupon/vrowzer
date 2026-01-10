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
 * Heartbeat ping message
 */
export const VROWSER_SW_PING = 'VROWSER_SW_PING'

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
export interface SvcWorkerVersionResponse {
  version: string
}

/**
 * SKIP_WAITING message (Page -> Service Worker)
 */
export interface SvcWorkerSkipWaitingMessage extends SvcWorkerMessageBase {
  type: typeof VROWSER_SW_SKIP_WAITING
}

/**
 * Union type of all messages from Page to Service Worker
 */
export type SvcWorkerMessage = SvcWorkerVersionMessage | SvcWorkerSkipWaitingMessage
