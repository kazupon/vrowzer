import type { FSWatcher, WatchOptions } from '#dep-types/chokidar'
// NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
// import { EventEmitter } from 'node:events'
import path from 'node:path'
import colors from 'picocolors'
import type { OutputOptions, WatcherOptions } from 'rolldown'
import { escapePath } from 'tinyglobby'
import { withTrailingSlash } from '../shared/utils'
import type { Logger } from './logger'
import { arraify, normalizePath } from './utils'

export function getResolvedOutDirs(
  root: string,
  outDir: string,
  outputOptions: OutputOptions[] | OutputOptions | undefined,
): Set<string> {
  const resolvedOutDir = path.resolve(root, outDir)
  if (!outputOptions) { return new Set([resolvedOutDir]) }

  return new Set(
    arraify(outputOptions).map(({ dir }) =>
      dir ? path.resolve(root, dir) : resolvedOutDir,
    ),
  )
}

export function resolveEmptyOutDir(
  emptyOutDir: boolean | null,
  root: string,
  outDirs: Set<string>,
  logger?: Logger,
): boolean {
  if (emptyOutDir != null) { return emptyOutDir }

  for (const outDir of outDirs) {
    if (!normalizePath(outDir).startsWith(withTrailingSlash(root))) {
      // warn if outDir is outside of root
      logger?.warn(
        colors.yellow(
          `\n${colors.bold(`(!)`)} outDir ${colors.white(
            colors.dim(outDir),
          )} is not inside project root and will not be emptied.\n` +
          `Use --emptyOutDir to override.\n`,
        ),
      )
      return false
    }
  }
  return true
}

export function resolveChokidarOptions(
  options: WatchOptions | undefined,
  resolvedOutDirs: Set<string>,
  emptyOutDir: boolean,
  cacheDir: string,
): WatchOptions {
  const { ignored: ignoredList, ...otherOptions } = options ?? {}
  const ignored: WatchOptions['ignored'] = [
    '**/.git/**',
    '**/node_modules/**',
    '**/test-results/**', // Playwright
    escapePath(cacheDir) + '/**',
    ...arraify(ignoredList || []),
  ]
  if (emptyOutDir) {
    ignored.push(
      ...[...resolvedOutDirs].map((outDir) => escapePath(outDir) + '/**'),
    )
  }

  const resolvedWatchOptions: WatchOptions = {
    ignored,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...otherOptions,
  }

  return resolvedWatchOptions
}

export function convertToWatcherOptions(
  options: WatchOptions | undefined,
): WatcherOptions['watcher'] {
  if (!options) { return }

  return {
    usePolling: options.usePolling,
    pollInterval: options.interval,
  }
}

// NOTE(kazupon): Remove EventEmitter inheritance for browser env (Service Worker)
// Implements FSWatcher which extends VirtualFSWatcher from @vrowzer/fs/watcher
class NoopWatcher implements FSWatcher {
  options: WatchOptions

  constructor(options: WatchOptions) {
    this.options = options
  }

  // VirtualFSWatcher specific
  notify() { }

  // chokidar FSWatcher interface
  on(_event: string, _listener: (...args: any[]) => void): this { return this }
  add() { return this }
  unwatch() { return this }
  getWatched() { return {} }
  ref() { return this }
  unref() { return this }
  async close() { }

  // EventEmitter I/F
  off() { return this }
  once() { return this }
  emit() { return false }
  removeListener() { return this }
  removeAllListeners() { return this }
  addListener() { return this }
  listeners() { return [] }
  listenerCount() { return 0 }
  eventNames(): string[] { return [] }
  getMaxListeners() { return Infinity }
  setMaxListeners() { return this }
  prependListener() { return this }
  prependOnceListener() { return this }
  rawListeners() { return [] }
}

export function createNoopWatcher(options: WatchOptions): FSWatcher {
  return new NoopWatcher(options)
}
// NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
// class NoopWatcher extends EventEmitter implements FSWatcher {
//   constructor(public options: WatchOptions) {
//     super()
//   }
//
//   add() {
//     return this
//   }
//
//   unwatch() {
//     return this
//   }
//
//   getWatched() {
//     return {}
//   }
//
//   ref() {
//     return this
//   }
//
//   unref() {
//     return this
//   }
//
//   async close() {
//     // noop
//   }
// }
//
// export function createNoopWatcher(options: WatchOptions): FSWatcher {
//   return new NoopWatcher(options)
// }
