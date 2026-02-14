/**
 * `node:util` compatible entry point
 *
 * @module util
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Convert a Node.js-style callback function to a promise-returning function.
 * The callback must follow the `(err, result)` convention.
 */
export function promisify<TArgs extends unknown[], TResult>(
  fn: (...args: [...TArgs, (err: unknown, result: TResult) => void]) => void
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) =>
    new Promise<TResult>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- general utility function, type safety is the caller's responsibility
      ;(fn as Function)(
        ...args,
        (err: unknown, result: TResult) => {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- we want to allow rejecting with non-Error values for compatibility with Node.js callback conventions
          err ? reject(err) : resolve(result)
        }
      )
    })
}

/**
 * Return a string representation of an object for debugging purposes.
 * Browser-compatible alternative to Node.js `util.inspect`.
 */
export function inspect(value: unknown, _options?: { depth?: number }): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

const ansiRegex =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g

/**
 * Remove ANSI escape codes (VT control characters) from a string.
 * Browser-compatible alternative to Node.js `util.stripVTControlCharacters`.
 */
export function stripVTControlCharacters(str: string): string {
  return str.replace(ansiRegex, '')
}
