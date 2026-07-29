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
      // oxlint-disable-next-line typescript/no-unsafe-call -- general utility function, type safety is the caller's responsibility
      ;(fn as Function)(...args, (err: unknown, result: TResult) => {
        // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- we want to allow rejecting with non-Error values for compatibility with Node.js callback conventions
        err ? reject(err) : resolve(result)
      })
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

/**
 * Printf-style string formatting.
 * Supports %s (string), %d/%i (integer), %f (float), %j (JSON), %o/%O (object), %% (literal %).
 * Extra arguments are appended with space separator.
 */
export function format(...args: unknown[]): string {
  if (args.length === 0) {
    return ''
  }
  const first = args[0]
  if (typeof first !== 'string') {
    return args.map(a => (typeof a === 'string' ? a : inspect(a))).join(' ')
  }

  let i = 1
  let result = first.replace(/%[sdifjoO%]/g, (match: string) => {
    if (match === '%%') {
      return '%'
    }
    if (i >= args.length) {
      return match
    }
    const arg = args[i++]
    switch (match) {
      case '%s':
        return String(arg)
      case '%d':
        return Number(arg).toString()
      case '%i':
        return Math.trunc(Number(arg)).toString()
      case '%f':
        return Number(arg).toString()
      case '%j':
        try {
          return JSON.stringify(arg)
        } catch {
          return '[Circular]'
        }
      case '%o':
      case '%O':
        return inspect(arg)
      default:
        return match
    }
  })

  // Append remaining arguments
  for (; i < args.length; i++) {
    const arg = args[i]
    result += ' ' + (typeof arg === 'string' ? arg : inspect(arg))
  }

  return result
}

/**
 * Format with options. In browser environments, the options are ignored
 * and this behaves like `format()`.
 */
export function formatWithOptions(_inspectOptions: unknown, ...args: unknown[]): string {
  return format(...args)
}

/**
 * Copy properties from source to target (Object.assign equivalent).
 * @deprecated Use Object.assign instead.
 */
export function _extend<T extends object>(target: T, source: object): T {
  return Object.assign(target, source)
}

/**
 * Wrap a function with a deprecation warning.
 * In browser environments, the warning is suppressed and the original function is returned as-is.
 */
export function deprecate<T extends Function>(fn: T, _msg: string, _code?: string): T {
  return fn
}

/**
 * Apply ANSI styling to text (Node.js 21.7+ API).
 * In browser environments, returns the text without styling.
 */
export function styleText(_format: string | string[], text: string): string {
  return text
}

export default {
  promisify,
  inspect,
  stripVTControlCharacters,
  format,
  formatWithOptions,
  _extend,
  deprecate,
  styleText
}
