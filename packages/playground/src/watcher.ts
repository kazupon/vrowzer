/**
 * FSWatcher implementation compatible with Node.js and chokidar FSWatcher interface
 */

import EventEmitter from './emitter.ts'

import type * as fs from 'node:fs'

/**
 * Event type for file system changes
 */
type WatchEventType = 'rename' | 'change'

/**
 * Listener for 'change' events
 */
type WatchListener<T> = (eventType: WatchEventType, filename: T) => void

/**
 * Options for FSWatcher constructor
 */
interface FSWatcherOptions {
  /**
   * Specifies the character encoding to be used for the filename passed to the listener
   * @default 'utf8'
   */
  encoding?: BufferEncoding | 'buffer'
  /**
   * Indicates whether the process should continue to run as long as files are being watched
   * @default true
   */
  persistent?: boolean
  /**
   * Indicates whether all subdirectories should be watched, or only the current directory
   * @default false
   */
  recursive?: boolean
}

/**
 * Options for fs.watch()
 */
interface WatchOptions extends FSWatcherOptions {
  /**
   * Allows closing the watcher with an AbortSignal
   */
  signal?: AbortSignal
}

/**
 * FSWatcher interface compatible with Node.js fs.FSWatcher
 */
interface FSWatcher extends EventEmitter {
  /**
   * Stop watching for changes on the given `fs.FSWatcher`. Once stopped, the `fs.FSWatcher` object is no longer usable.
   * @since v0.5.8
   */
  close(): void
  /**
   * When called, requests that the Node.js event loop _not_ exit so long as the `fs.FSWatcher` is active. Calling `watcher.ref()` multiple times will have
   * no effect.
   *
   * By default, all `fs.FSWatcher` objects are "ref'ed", making it normally
   * unnecessary to call `watcher.ref()` unless `watcher.unref()` had been
   * called previously.
   * @since v14.3.0, v12.20.0
   */
  ref(): this
  /**
   * When called, the active `fs.FSWatcher` object will not require the Node.js
   * event loop to remain active. If there is no other activity keeping the
   * event loop running, the process may exit before the `fs.FSWatcher` object's
   * callback is invoked. Calling `watcher.unref()` multiple times will have
   * no effect.
   * @since v14.3.0, v12.20.0
   */
  unref(): this
  /**
   * events.EventEmitter
   *   1. change
   *   2. close
   *   3. error
   */
  addListener(event: string, listener: (...args: any[]) => void): this
  addListener(
    event: 'change',
    listener: (eventType: string, filename: string | NonSharedBuffer) => void
  ): this
  addListener(event: 'close', listener: () => void): this
  addListener(event: 'error', listener: (error: Error) => void): this
  on(event: string, listener: (...args: any[]) => void): this
  on(
    event: 'change',
    listener: (eventType: string, filename: string | NonSharedBuffer) => void
  ): this
  on(event: 'close', listener: () => void): this
  on(event: 'error', listener: (error: Error) => void): this
  once(event: string, listener: (...args: any[]) => void): this
  once(
    event: 'change',
    listener: (eventType: string, filename: string | NonSharedBuffer) => void
  ): this
  once(event: 'close', listener: () => void): this
  once(event: 'error', listener: (error: Error) => void): this
  prependListener(event: string, listener: (...args: any[]) => void): this
  prependListener(
    event: 'change',
    listener: (eventType: string, filename: string | NonSharedBuffer) => void
  ): this
  prependListener(event: 'close', listener: () => void): this
  prependListener(event: 'error', listener: (error: Error) => void): this
  prependOnceListener(event: string, listener: (...args: any[]) => void): this
  prependOnceListener(
    event: 'change',
    listener: (eventType: string, filename: string | NonSharedBuffer) => void
  ): this
  prependOnceListener(event: 'close', listener: () => void): this
  prependOnceListener(event: 'error', listener: (error: Error) => void): this
}

interface ChokidarOptions {
  /**
   * Indicates whether the process should continue to run as long as files are being watched. If
   * set to `false` when using `fsevents` to watch, no more events will be emitted after `ready`,
   * even if the process continues to run.
   */
  persistent?: boolean

  /**
   * ([anymatch](https://github.com/micromatch/anymatch)-compatible definition) Defines files/paths to
   * be ignored. The whole relative or absolute path is tested, not just filename. If a function
   * with two arguments is provided, it gets called twice per path - once with a single argument
   * (the path), second time with two arguments (the path and the
   * [`fs.Stats`](https://nodejs.org/api/fs.html#fs_class_fs_stats) object of that path).
   */
  ignored?: Matcher

  /**
   * If set to `false` then `add`/`addDir` events are also emitted for matching paths while
   * instantiating the watching as chokidar discovers these file paths (before the `ready` event).
   */
  ignoreInitial?: boolean

  /**
   * When `false`, only the symlinks themselves will be watched for changes instead of following
   * the link references and bubbling events through the link's path.
   */
  followSymlinks?: boolean

  /**
   * The base directory from which watch `paths` are to be derived. Paths emitted with events will
   * be relative to this.
   */
  cwd?: string

  /**
   * If set to true then the strings passed to .watch() and .add() are treated as literal path
   * names, even if they look like globs.
   *
   * @default false
   */
  disableGlobbing?: boolean

  /**
   * Whether to use fs.watchFile (backed by polling), or fs.watch. If polling leads to high CPU
   * utilization, consider setting this to `false`. It is typically necessary to **set this to
   * `true` to successfully watch files over a network**, and it may be necessary to successfully
   * watch files in other non-standard situations. Setting to `true` explicitly on OS X overrides
   * the `useFsEvents` default.
   */
  usePolling?: boolean

  /**
   * Whether to use the `fsevents` watching interface if available. When set to `true` explicitly
   * and `fsevents` is available this supersedes the `usePolling` setting. When set to `false` on
   * OS X, `usePolling: true` becomes the default.
   */
  useFsEvents?: boolean

  /**
   * If relying upon the [`fs.Stats`](https://nodejs.org/api/fs.html#fs_class_fs_stats) object that
   * may get passed with `add`, `addDir`, and `change` events, set this to `true` to ensure it is
   * provided even in cases where it wasn't already available from the underlying watch events.
   */
  alwaysStat?: boolean

  /**
   * If set, limits how many levels of subdirectories will be traversed.
   */
  depth?: number

  /**
   * Interval of file system polling.
   */
  interval?: number

  /**
   * Interval of file system polling for binary files. ([see list of binary extensions](https://gi
   * thub.com/sindresorhus/binary-extensions/blob/master/binary-extensions.json))
   */
  binaryInterval?: number

  /**
   *  Indicates whether to watch files that don't have read permissions if possible. If watching
   *  fails due to `EPERM` or `EACCES` with this set to `true`, the errors will be suppressed
   *  silently.
   */
  ignorePermissionErrors?: boolean

  /**
   * `true` if `useFsEvents` and `usePolling` are `false`. Automatically filters out artifacts
   * that occur when using editors that use "atomic writes" instead of writing directly to the
   * source file. If a file is re-added within 100 ms of being deleted, Chokidar emits a `change`
   * event rather than `unlink` then `add`. If the default of 100 ms does not work well for you,
   * you can override it by setting `atomic` to a custom value, in milliseconds.
   */
  atomic?: boolean | number

  /**
   * can be set to an object in order to adjust timing params:
   */
  awaitWriteFinish?: AwaitWriteFinishOptions | boolean
}

interface AwaitWriteFinishOptions {
  /**
   * Amount of time in milliseconds for a file size to remain constant before emitting its event.
   */
  stabilityThreshold?: number

  /**
   * File size polling interval.
   */
  pollInterval?: number
}

type AnymatchFn = (testString: string) => boolean
type AnymatchPattern = string | RegExp | AnymatchFn
type AnymatchMatcher = AnymatchPattern | AnymatchPattern[]

type Matcher = AnymatchMatcher

/**
 * Defitnion chokidar FSWatcher interfaces
 * ref: https://github.com/vitejs/vite/blob/main/packages/vite/src/types/chokidar.d.ts
 */
// @ts-expect-error -- FIXME: Cannot merge interfaces with different names
interface Chokidar extends FSWatcher {
  // options: ChokidarOptions

  /**
   * Constructs a new FSWatcher instance with optional WatchOptions parameter.
   */
  // new(options?: ChokidarOptions): Chokidar

  /**
   * When called, requests that the Node.js event loop not exit so long as the fs.FSWatcher is active.
   * Calling watcher.ref() multiple times will have no effect.
   */
  ref(): this

  /**
   * When called, the active fs.FSWatcher object will not require the Node.js event loop to remain active.
   * If there is no other activity keeping the event loop running, the process may exit before the fs.FSWatcher object's callback is invoked.
   * Calling watcher.unref() multiple times will have no effect.
   */
  unref(): this

  /**
   * Add files, directories, or glob patterns for tracking. Takes an array of strings or just one
   * string.
   */
  add(paths: string | ReadonlyArray<string>): this

  /**
   * Stop watching files, directories, or glob patterns. Takes an array of strings or just one
   * string.
   */
  unwatch(paths: string | ReadonlyArray<string>): this

  /**
   * Returns an object representing all the paths on the file system being watched by this
   * `FSWatcher` instance. The object's keys are all the directories (using absolute paths unless
   * the `cwd` option was used), and the values are arrays of the names of the items contained in
   * each directory.
   */
  getWatched(): {
    [directory: string]: string[]
  }

  /**
   * Removes all listeners from watched files.
   */
  close(): void

  on(event: 'add' | 'addDir' | 'change', listener: (path: string, stats?: fs.Stats) => void): this

  on(
    event: 'all',
    listener: (
      eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
      path: string,
      stats?: fs.Stats
    ) => void
  ): this

  /**
   * Error occurred
   */
  on(event: 'error', listener: (error: Error) => void): this

  /**
   * Exposes the native Node `fs.FSWatcher events`
   */
  on(event: 'raw', listener: (eventName: string, path: string, details: any) => void): this

  /**
   * Fires when the initial scan is complete
   */
  on(event: 'ready', listener: () => void): this

  on(event: 'unlink' | 'unlinkDir', listener: (path: string) => void): this
}

class Browserdar extends EventEmitter implements Chokidar {
  options: ChokidarOptions

  constructor(options: ChokidarOptions) {
    super()
    this.options = options
  }

  add() {
    return this
  }

  unwatch() {
    return this
  }

  getWatched() {
    return {}
  }

  ref() {
    return this
  }

  unref() {
    return this
  }

  close() {
    // noop
  }
}

export function createBrowserdar(options: ChokidarOptions): Browserdar {
  return new Browserdar(options)
}
