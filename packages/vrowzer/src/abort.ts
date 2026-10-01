/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Waits for `promise`, but rejects with `signal.reason` as soon as `signal` is aborted.
 *
 * A later settlement of `promise` is ignored, so it never becomes an unhandled rejection.
 *
 * @param promise - The promise to wait for.
 * @param signal - Aborts the wait. Without a signal, `promise` is returned as is.
 * @returns A promise that settles like `promise`, or rejects when `signal` is aborted first.
 */
export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    promise.catch(() => undefined)
    return Promise.reject(signal.reason)
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}
