// TODO: fill in code later ...

import debug from 'obug'
import type { Debugger } from 'obug'

// TODO: fill in code later ...

// set in bin/vite.js
// NOTE(kazupon): for browser env, we use import.meta.env
// const filter = process.env.VITE_DEBUG_FILTER
const filter = import.meta.env.VITE_DEBUG_FILTER

// NOTE(kazupon): for browser env, we use import.meta.env
// const DEBUG = process.env.DEBUG
const DEBUG = import.meta.env.DEBUG

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
