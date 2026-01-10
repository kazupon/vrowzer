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
