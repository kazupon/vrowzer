/**
 * VirtualFSWatcher - chokidar compatible FSWatcher for virtual filesystems.
 *
 * Unlike real chokidar, this watcher does not monitor the filesystem.
 * File events are triggered externally via `notify()` by the FileSystemSubscriber.
 *
 * @module watcher/virtual
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export type WatchEventName = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'

/**
 * Watch options for VirtualFSWatcher.
 * Uses an index signature for structural compatibility with chokidar's WatchOptions.
 */
export interface VirtualWatchOptions {
  [key: string]: any
}

/**
 * chokidar compatible FSWatcher interface for virtual filesystems.
 *
 * This interface is the base type that vite-dev-server's `FSWatcher` extends.
 * The `notify()` method is specific to VirtualFSWatcher.
 */
export interface VirtualFSWatcher {
  options: VirtualWatchOptions

  // ---- VirtualFSWatcher specific ----

  /**
   * Notify the watcher of a file event.
   * Called by FileSystemSubscriber when a V_FS_* message is received.
   */
  notify(event: WatchEventName, path: string): void

  // ---- chokidar FSWatcher interface ----

  add(paths: string | ReadonlyArray<string>): VirtualFSWatcher
  unwatch(paths: string | ReadonlyArray<string>): VirtualFSWatcher
  getWatched(): { [directory: string]: string[] }
  close(): Promise<void>
  ref(): VirtualFSWatcher
  unref(): VirtualFSWatcher

  // ---- EventEmitter I/F (chokidar compatible) ----

  on(
    event: 'add' | 'addDir' | 'change',
    listener: (path: string, stats?: any) => void
  ): VirtualFSWatcher
  on(
    event: 'all',
    listener: (eventName: WatchEventName, path: string, stats?: any) => void
  ): VirtualFSWatcher
  on(event: 'error', listener: (error: Error) => void): VirtualFSWatcher
  on(
    event: 'raw',
    listener: (eventName: string, path: string, details: any) => void
  ): VirtualFSWatcher
  on(event: 'ready', listener: () => void): VirtualFSWatcher
  on(event: 'unlink' | 'unlinkDir', listener: (path: string) => void): VirtualFSWatcher
  on(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  off(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  once(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  emit(event: string, ...args: any[]): boolean
  removeListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  removeAllListeners(event?: string): VirtualFSWatcher
  addListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  listeners(event: string): Function[]
  listenerCount(event: string): number
  eventNames(): string[]
  getMaxListeners(): number
  setMaxListeners(n: number): VirtualFSWatcher
  prependListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  prependOnceListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher
  rawListeners(event: string): Function[]
}

/**
 * Create a VirtualFSWatcher instance.
 *
 * @param options - Watch options (structural compatibility with chokidar WatchOptions)
 * @returns VirtualFSWatcher instance
 */
export function createVirtualFSWatcher(
  options: VirtualWatchOptions = {}
): Readonly<VirtualFSWatcher> {
  const handlers = new Map<string, Set<(...args: any[]) => void>>()
  let closed = false

  function _emit(event: string, ...args: any[]): boolean {
    const listeners = handlers.get(event)
    if (!listeners?.size) {
      return false
    }
    // Clone the set before iterating to avoid issues if handlers are modified during iteration
    for (const handler of [...listeners]) {
      handler(...args)
    }
    return true
  }

  const watcher: VirtualFSWatcher = {
    options,

    // ---- VirtualFSWatcher specific ----

    notify(event, path) {
      if (closed) {
        return
      }
      _emit(event, path)
      _emit('all', event, path)
    },

    // ---- chokidar FSWatcher interface ----

    add() {
      return watcher
    },
    unwatch() {
      return watcher
    },
    getWatched() {
      return {}
    },
    async close() {
      closed = true
      handlers.clear()
    },
    ref() {
      return watcher
    },
    unref() {
      return watcher
    },

    // ---- EventEmitter I/F ----

    on(event: string, listener: (...args: any[]) => void) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(listener)
      return watcher
    },

    off(event, listener) {
      handlers.get(event)?.delete(listener)
      return watcher
    },

    once(event, listener) {
      const wrapper = (...args: any[]) => {
        watcher.off(event, wrapper)
        listener(...args)
      }
      return watcher.on(event, wrapper)
    },

    emit(event, ...args) {
      return _emit(event, ...args)
    },

    removeListener(event, listener) {
      return watcher.off(event, listener)
    },

    removeAllListeners(event?) {
      if (event) {
        handlers.delete(event)
      } else {
        handlers.clear()
      }
      return watcher
    },

    addListener(event, listener) {
      return watcher.on(event, listener)
    },

    listeners(event) {
      return [...(handlers.get(event) ?? [])]
    },

    listenerCount(event) {
      return handlers.get(event)?.size ?? 0
    },

    eventNames() {
      return [...handlers.keys()]
    },

    getMaxListeners() {
      return Infinity
    },
    setMaxListeners() {
      return watcher
    },

    prependListener(event, listener) {
      return watcher.on(event, listener)
    },

    prependOnceListener(event, listener) {
      return watcher.once(event, listener)
    },

    rawListeners(event) {
      return watcher.listeners(event)
    }
  }

  return Object.freeze(watcher)
}
