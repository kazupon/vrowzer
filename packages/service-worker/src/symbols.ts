/**
 * Internal symbols for accessing private properties.
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Symbol for accessing the session of a service worker controller.
 * Used by `admin.ts` to communicate with service worker.
 *
 * @internal
 */
export const SESSION_SYMBOL: unique symbol = Symbol('svcWorkerSession')
