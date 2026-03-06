/**
 * `node:tty` compatible entry point
 *
 * Browser/Worker environments have no TTY. All functions return safe defaults.
 *
 * @module tty
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Check if the given file descriptor is associated with a TTY.
 * Always returns `false` in browser/Worker environments.
 */
export function isatty(_fd?: number): boolean {
  return false
}

/**
 * Stub ReadStream class for browser/Worker environments.
 */
export class ReadStream {
  readonly isTTY = false as const
  readonly isRaw = false
  setRawMode(_mode: boolean): this {
    return this
  }
}

/**
 * Stub WriteStream class for browser/Worker environments.
 */
export class WriteStream {
  readonly isTTY = false as const
  readonly columns = 80
  readonly rows = 24
  clearLine(_dir: number, _callback?: () => void): boolean {
    return true
  }
  clearScreenDown(_callback?: () => void): boolean {
    return true
  }
  cursorTo(_x: number, _y?: number, _callback?: () => void): boolean {
    return true
  }
  moveCursor(_dx: number, _dy: number, _callback?: () => void): boolean {
    return true
  }
  getColorDepth(): number {
    return 1
  }
  hasColors(_count?: number): boolean {
    return false
  }
  getWindowSize(): [number, number] {
    return [this.columns, this.rows]
  }
}

export default {
  isatty,
  ReadStream,
  WriteStream
}
