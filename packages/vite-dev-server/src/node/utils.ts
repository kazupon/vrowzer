// TODO: fill in code later ...

import path from 'node:path'

// TODO: fill in code later ...

import type { Debugger } from 'obug'

// TODO: fill in code later ...

import { isWindows, slash, splitFileAndPostfix, withTrailingSlash } from '../shared/utils'

// TODO: fill in code later ...

import debug from 'obug'

// TODO: fill in code later ...

import { VALID_ID_PREFIX } from '../shared/constants'
import {
  cleanUrl,
} from '../shared/utils'
// import { createIsBuiltin } from '../shared/builtin'
import {
  // CLIENT_ENTRY,
  CLIENT_PUBLIC_PATH,
  CSS_LANGS_RE,
  ENV_PUBLIC_PATH,
  FS_PREFIX,
} from './constants'

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

// TODO: fill in code later ...

const VOLUME_RE = /^[A-Z]:/i

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

export function fsPathFromId(id: string): string {
  const fsPath = normalizePath(
    id.startsWith(FS_PREFIX) ? id.slice(FS_PREFIX.length) : id,
  )
  return fsPath[0] === '/' || VOLUME_RE.test(fsPath) ? fsPath : `/${fsPath}`
}

export function fsPathFromUrl(url: string): string {
  return fsPathFromId(cleanUrl(url))
}

// TOOD: fill in code later ...

// NOTE: We should start relying on the "Sec-Fetch-Dest" header instead of this
// hardcoded list. We can eventually remove this function when the minimum version
// of browsers we support in dev all support this header.
const knownJsSrcRE =
  /\.(?:[jt]sx?|m[jt]s|vue|marko|svelte|astro|imba|mdx)(?:$|\?)/
export const isJSRequest = (url: string): boolean => {
  url = cleanUrl(url)
  if (knownJsSrcRE.test(url)) {
    return true
  }
  if (!path.extname(url) && url[url.length - 1] !== '/') {
    return true
  }
  return false
}

export const isCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request)

const importQueryRE = /(\?|&)import=?(?:&|$)/
const directRequestRE = /(\?|&)direct=?(?:&|$)/
const internalPrefixes = [
  FS_PREFIX,
  VALID_ID_PREFIX,
  CLIENT_PUBLIC_PATH,
  ENV_PUBLIC_PATH,
]
const InternalPrefixRE = new RegExp(`^(?:${internalPrefixes.join('|')})`)
const trailingSeparatorRE = /[?&]$/
export const isImportRequest = (url: string): boolean => importQueryRE.test(url)
export const isInternalRequest = (url: string): boolean =>
  InternalPrefixRE.test(url)

export function removeImportQuery(url: string): string {
  return url.replace(importQueryRE, '$1').replace(trailingSeparatorRE, '')
}
export function removeDirectQuery(url: string): string {
  return url.replace(directRequestRE, '$1').replace(trailingSeparatorRE, '')
}

export const urlRE: RegExp = /(\?|&)url(?:&|$)/
export const rawRE: RegExp = /(\?|&)raw(?:&|$)/
export function removeUrlQuery(url: string): string {
  return url.replace(urlRE, '$1').replace(trailingSeparatorRE, '')
}
export function removeRawQuery(url: string): string {
  return url.replace(rawRE, '$1').replace(trailingSeparatorRE, '')
}

export function injectQuery(url: string, queryToInject: string): string {
  const { file, postfix } = splitFileAndPostfix(url)
  const normalizedFile = isWindows ? slash(file) : file
  return `${normalizedFile}?${queryToInject}${postfix[0] === '?' ? `&${postfix.slice(1)}` : /* hash only */ postfix}`
}

const timestampRE = /\bt=\d{13}&?\b/
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
