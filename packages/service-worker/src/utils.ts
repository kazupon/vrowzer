/**
 * Service Worker Utilities
 *
 * Shared utility functions for service worker communication.
 *
 * @module utils
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Options for safe postMessage operations.
 */
export interface SafePostMessageOptions {
  /**
   * Array of transferable objects to transfer ownership.
   */
  transfer?: Transferable[]
  /**
   * Callback invoked when an error occurs during postMessage.
   */
  onError?: (error: unknown) => void
  /**
   * Context string for error logging.
   */
  context?: string
  /**
   * Debug logger function. If not provided, uses console.error.
   */
  debug?: Console['debug']
}

/**
 * Interface for objects that support postMessage (MessagePort, ServiceWorker, etc.)
 */
interface PostMessageTarget {
  postMessage(message: unknown, transfer?: Transferable[]): void
}

/**
 * Safely send a message through a postMessage-capable target.
 *
 * This function wraps postMessage in a try-catch to handle errors gracefully,
 * logging errors and invoking optional callbacks when failures occur.
 *
 * @param target - The target to send the message to (MessagePort, ServiceWorker, etc.)
 * @param message - The message to send
 * @param options - Optional settings including transfer and error handling
 * @returns true if sent successfully, false if failed
 *
 * @example
 * ```ts
 * // With MessagePort
 * const sent = safePostMessage(port, { type: 'ping' }, {
 *   context: 'ping message',
 *   onError: () => cleanupPort()
 * })
 *
 * // With ServiceWorker and transfer
 * const sent = safePostMessage(serviceWorker, message, {
 *   transfer: [port],
 *   context: 'version request'
 * })
 * ```
 */
export function safePostMessage(
  target: PostMessageTarget,
  message: unknown,
  options?: SafePostMessageOptions
): boolean {
  try {
    target.postMessage(message, options?.transfer)
    return true
  } catch (error) {
    const logger = options?.debug ?? console.error
    logger(`safePostMessage failed${options?.context ? ` (${options.context})` : ''}`, error)
    options?.onError?.(error)
    return false
  }
}
