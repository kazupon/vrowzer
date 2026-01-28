// TODO: fill in code later ...

import type { Debugger } from 'obug'

// TODO: fill in code later ...

import debug from 'obug'

// TODO: fill in code later ...

import { FS_PREFIX } from './constants'

// TODO: fill in code later ...

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

// TODO: fill in code later ...

export function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}

// TODO: fill in code later ...

// set in bin/vite.js
// NOTE(kazupon): for browser env, we use import.meta.env
// const filter = process.env.VITE_DEBUG_FILTER
const filter = import.meta.env.VITE_DEBUG_FILTER

// NOTE(kazupon): for browser env, we use import.meta.env
// const DEBUG = process.env.DEBUG
const DEBUG = import.meta.env.DEBUG

// NOTE(kazupon): for browser env, we use `import.meta.env`
// Initialize debug logging for Service Worker environment
// obug cannot access `localStorage` in Service Worker, so we use `import.meta.env.DEBUG`
if (DEBUG) {
  debug.enable(DEBUG!)
}

interface DebuggerOptions {
  onlyWhenFocused?: boolean | string
  depth?: number
}

export type ViteDebugScope = `vite:${string}` | `vrowser:${string}`

export function createDebugger(
  namespace: ViteDebugScope,
  options: DebuggerOptions = {},
): Debugger['log'] | undefined {
  const log = debug(namespace)
  const { onlyWhenFocused, depth } = options

  if (depth && log.inspectOpts && log.inspectOpts.depth == null) {
    log.inspectOpts.depth = options.depth
  }

  let enabled = log.enabled
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
    enabled = !!DEBUG?.includes(ns)
  }

  if (enabled) {
    return (...args: [string, ...any[]]) => {
      if (!filter || args.some((a) => a?.includes?.(filter))) {
        log(...args)
      }
    }
  }
}

// TODO: fill in code later ...

export interface Hostname {
  /** undefined sets the default behaviour of server.listen */
  host: string | undefined
  /** resolve to localhost when possible */
  name: string
}

// TOOD: fill in code later ...

const timestampRE = /\bt=\d{13}&?\b/

// TOOD: fill in code later ...

const trailingSeparatorRE = /[?&]$/
export function removeTimestampQuery(url: string): string {
  return url.replace(timestampRE, '').replace(trailingSeparatorRE, '')
}

/**
 * Pretty format URL for logging (Service Worker version - no colors)
 */
export function prettifyUrl(url: string, root: string): string {
  url = removeTimestampQuery(url)

  if (url.startsWith(FS_PREFIX)) {
    return url.slice(FS_PREFIX.length)
  }

  if (url.startsWith(root)) {
    return url.slice(root.length)
  }

  return url
}

/**
 * Calculate and format elapsed time (Service Worker version - no colors)
 */
export function timeFrom(start: number, subtract = 0): string {
  const time = performance.now() - start - subtract
  const timeString = `${time.toFixed(2)}ms`.padEnd(5, ' ')
  return timeString
}

// TODO: fill in code later ...

export function joinUrlSegments(a: string, b: string): string {
  if (!a || !b) {
    return a || b || ''
  }
  if (a.endsWith('/')) {
    a = a.substring(0, a.length - 1)
  }
  if (b[0] !== '/') {
    b = '/' + b
  }
  return a + b
}

// TODO: fill in code later ...

export function stripBase(path: string, base: string): string {
  if (path === base) {
    return '/'
  }
  const devBase = withTrailingSlash(base)
  return path.startsWith(devBase) ? path.slice(devBase.length - 1) : path
}

// TODO: fill in code later ...
