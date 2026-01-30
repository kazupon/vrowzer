import type { Alias, AliasOptions } from '#dep-types/alias'
import type { FSWatcher } from '#dep-types/chokidar'
import type { DecodedSourceMap, RawSourceMap } from '@jridgewell/remapping'
import remapping from '@jridgewell/remapping'
import type MagicString from 'magic-string'
import fs from 'node:fs'
import path from 'node:path'
import type { Debugger } from 'obug'
import debug from 'obug'
import type { TransformResult } from 'rolldown'
import { VALID_ID_PREFIX } from '../shared/constants'
import { cleanUrl, isWindows, slash, splitFileAndPostfix, withTrailingSlash } from '../shared/utils'
import type { ResolvedConfig } from './config'
// import { createIsBuiltin } from '../shared/builtin'
import {
  // CLIENT_ENTRY,
  CLIENT_PUBLIC_PATH,
  CSS_LANGS_RE,
  ENV_PUBLIC_PATH,
  FS_PREFIX,
} from './constants'

// TODO: fill in code later ...

import type { BuildEnvironmentOptions } from './build'

// TODO: fill in code later ...

// https://github.com/rolldown/rolldown/blob/62fba31428af244f871f0e119ed43936ee5d01fd/packages/rolldown/src/log/logger.ts#L64
export const rollupVersion = '4.23.0'
export const rolldownVersion = '1.0.0-rc.1'
// export { VERSION as rolldownVersion } from 'rolldown'

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

export const externalRE: RegExp = /^([a-z]+:)?\/\//
export const isExternalUrl = (url: string): boolean => externalRE.test(url)

export const dataUrlRE: RegExp = /^\s*data:/i
export const isDataUrl = (url: string): boolean => dataUrlRE.test(url)

export const virtualModuleRE: RegExp = /^virtual-module:.*/
export const virtualModulePrefix = 'virtual-module:'

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

// TODO: fill in code later ...

export function timeFrom(start: number, subtract = 0): string {
  const time = performance.now() - start - subtract
  const timeString = `${time.toFixed(2)}ms`.padEnd(5, ' ')
  return timeString
}

// TODO: fill in code later ...

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

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value != null
}

// TODO: fill in code later ...

export const splitRE: RegExp = /\r?\n/g

const range: number = 2

export function pad(source: string, n = 2): string {
  const lines = source.split(splitRE)
  return lines.map((l) => ` `.repeat(n) + l).join(`\n`)
}

type Pos = {
  /** 1-based */
  line: number
  /** 0-based */
  column: number
}

export function posToNumber(source: string, pos: number | Pos): number {
  if (typeof pos === 'number') return pos
  const lines = source.split(splitRE)
  const { line, column } = pos
  let start = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    // @ts-expect-error -- FIXME(kazupon): fix me
    start += lines[i].length + 1
  }
  return start + column
}

export function numberToPos(source: string, offset: number | Pos): Pos {
  if (typeof offset !== 'number') return offset
  if (offset > source.length) {
    throw new Error(
      `offset is longer than source length! offset ${offset} > length ${source.length}`,
    )
  }

  const lines = source.slice(0, offset).split(splitRE)
  return {
    line: lines.length,
    // @ts-expect-error -- FIXME(kazupon): fix me
    column: lines[lines.length - 1].length,
  }
}

const MAX_DISPLAY_LEN = 120
const ELLIPSIS = '...'

export function generateCodeFrame(
  source: string,
  start: number | Pos = 0,
  end?: number | Pos,
): string {
  start = Math.max(posToNumber(source, start), 0)
  end = Math.min(
    end !== undefined ? posToNumber(source, end) : start,
    source.length,
  )
  const lastPosLine =
    end !== undefined
      ? numberToPos(source, end).line
      : numberToPos(source, start).line + range
  const lineNumberWidth = Math.max(3, String(lastPosLine).length + 1)
  const lines = source.split(splitRE)
  let count = 0
  const res: string[] = []
  for (let i = 0; i < lines.length; i++) {
    // @ts-expect-error -- FIXME(kazupon): fix me
    count += lines[i].length
    if (count >= start) {
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        // @ts-expect-error -- FIXME(kazupon): fix me
        const lineLength = lines[j].length
        const pad = Math.max(start - (count - lineLength), 0)
        const underlineLength = Math.max(
          1,
          end > count ? lineLength - pad : end - start,
        )

        let displayLine = lines[j]
        let underlinePad = pad
        if (lineLength > MAX_DISPLAY_LEN) {
          let startIdx = 0
          if (j === i) {
            if (underlineLength > MAX_DISPLAY_LEN) {
              startIdx = pad
            } else {
              const center = pad + Math.floor(underlineLength / 2)
              startIdx = Math.max(0, center - Math.floor(MAX_DISPLAY_LEN / 2))
            }
            underlinePad =
              Math.max(0, pad - startIdx) + (startIdx > 0 ? ELLIPSIS.length : 0)
          }
          const prefix = startIdx > 0 ? ELLIPSIS : ''
          const suffix = lineLength - startIdx > MAX_DISPLAY_LEN ? ELLIPSIS : ''
          const sliceLen = MAX_DISPLAY_LEN - prefix.length - suffix.length
          displayLine =
            // @ts-expect-error -- FIXME(kazupon): fix me
            prefix + displayLine.slice(startIdx, startIdx + sliceLen) + suffix
        }
        res.push(
          `${line}${' '.repeat(lineNumberWidth - String(line).length)}|  ${displayLine}`,
        )
        if (j === i) {
          // push underline
          const underline = '^'.repeat(
            Math.min(underlineLength, MAX_DISPLAY_LEN),
          )
          res.push(
            `${' '.repeat(lineNumberWidth)}|  ` +
            ' '.repeat(underlinePad) +
            underline,
          )
        } else if (j > i) {
          if (end > count) {
            const length = Math.max(Math.min(end - count, lineLength), 1)
            const underline = '^'.repeat(Math.min(length, MAX_DISPLAY_LEN))
            res.push(`${' '.repeat(lineNumberWidth)}|  ` + underline)
          }
          count += lineLength + 1
        }
      }
      break
    }
    count++
  }
  return res.join('\n')
}

// TODO: fill in code later ...

export function ensureWatchedFile(
  watcher: FSWatcher,
  file: string | null,
  root: string,
): void {
  if (
    file &&
    // only need to watch if out of root
    !file.startsWith(withTrailingSlash(root)) &&
    // some rollup plugins use null bytes for private resolved Ids
    !file.includes('\0') &&
    fs.existsSync(file)
  ) {
    // resolve file to normalized system path
    watcher.add(path.resolve(file))
  }
}

// TODO: fill in code later ...

const windowsDriveRE = /^[A-Z]:/
const replaceWindowsDriveRE = /^([A-Z]):\//
const linuxAbsolutePathRE = /^\/[^/]/
function escapeToLinuxLikePath(path: string) {
  if (windowsDriveRE.test(path)) {
    return path.replace(replaceWindowsDriveRE, '/windows/$1/')
  }
  if (linuxAbsolutePathRE.test(path)) {
    return `/linux${path}`
  }
  return path
}

const revertWindowsDriveRE = /^\/windows\/([A-Z])\//
function unescapeToLinuxLikePath(path: string) {
  if (path.startsWith('/linux/')) {
    return path.slice('/linux'.length)
  }
  if (path.startsWith('/windows/')) {
    return path.replace(revertWindowsDriveRE, '$1:/')
  }
  return path
}

// based on https://github.com/sveltejs/svelte/blob/abf11bb02b2afbd3e4cac509a0f70e318c306364/src/compiler/utils/mapped_code.ts#L221
const nullSourceMap: RawSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3,
}
/**
 * Combines multiple sourcemaps into a single sourcemap.
 * Note that the length of sourcemapList must be 2.
 */
export function combineSourcemaps(
  filename: string,
  sourcemapList: Array<DecodedSourceMap | RawSourceMap>,
): RawSourceMap {
  if (
    sourcemapList.length === 0 ||
    sourcemapList.every((m) => m.sources.length === 0)
  ) {
    return { ...nullSourceMap }
  }

  // hack for parse broken with normalized absolute paths on windows (C:/path/to/something).
  // escape them to linux like paths
  // also avoid mutation here to prevent breaking plugin's using cache to generate sourcemaps like vue (see #7442)
  sourcemapList = sourcemapList.map((sourcemap) => {
    const newSourcemaps = { ...sourcemap }
    newSourcemaps.sources = sourcemap.sources.map((source) =>
      source ? escapeToLinuxLikePath(source) : null,
    )
    if (sourcemap.sourceRoot) {
      newSourcemaps.sourceRoot = escapeToLinuxLikePath(sourcemap.sourceRoot)
    }
    return newSourcemaps
  })
  const escapedFilename = escapeToLinuxLikePath(filename)

  // We don't declare type here so we can convert/fake/map as RawSourceMap
  let map //: SourceMap
  let mapIndex = 1
  const useArrayInterface =
    sourcemapList.slice(0, -1).find((m) => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null)
  } else {
    // @ts-expect-error -- FIXME(kazupon): fix me
    map = remapping(sourcemapList[0], function loader(sourcefile) {
      // this line assumes that the length of the sourcemapList is 2
      if (sourcefile === escapedFilename && sourcemapList[mapIndex]) {
        return sourcemapList[mapIndex++]
      } else {
        return null
      }
    })
  }
  if (!map.file) {
    delete map.file
  }

  // unescape the previous hack
  map.sources = map.sources.map((source) =>
    source ? unescapeToLinuxLikePath(source) : source,
  )
  map.file = filename

  return map as RawSourceMap
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
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

export function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target]
}

// Taken from https://stackoverflow.com/a/36328890
export const multilineCommentsRE: RegExp = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g
export const singlelineCommentsRE: RegExp = /\/\/.*/g
export const requestQuerySplitRE: RegExp = /\?(?!.*[/|}])/
export const requestQueryMaybeEscapedSplitRE: RegExp = /\\?\?(?!.*[/|}])/

export const blankReplacer = (match: string): string => ' '.repeat(match.length)

// NOTE(kazupon): disable now, because we need to define for brwoser env later
// export function getHash(text: Buffer | string, length = 8): string {
//   const h = crypto.hash('sha256', text, 'hex').substring(0, length)
//   if (length <= 64) return h
//   return h.padEnd(length, '_')
// }

export function emptyCssComments(raw: string): string {
  return raw.replace(multilineCommentsRE, blankReplacer)
}

function backwardCompatibleWorkerPlugins(plugins: any) {
  if (Array.isArray(plugins)) {
    return plugins
  }
  if (typeof plugins === 'function') {
    return plugins()
  }
  return []
}

type DeepWritable<T> =
  T extends ReadonlyArray<unknown>
  ? { -readonly [P in keyof T]: DeepWritable<T[P]> }
  : T extends RegExp
  ? RegExp
  : T[keyof T] extends Function
  ? T
  : { -readonly [P in keyof T]: DeepWritable<T[P]> }

export function deepClone<T>(value: T): DeepWritable<T> {
  if (Array.isArray(value)) {
    return value.map((v) => deepClone(v)) as DeepWritable<T>
  }
  if (isObject(value)) {
    const cloned: Record<string, any> = {}
    for (const key in value) {
      cloned[key] = deepClone(value[key])
    }
    return cloned as DeepWritable<T>
  }
  if (typeof value === 'function') {
    return value as DeepWritable<T>
  }
  if (value instanceof RegExp) {
    return new RegExp(value) as DeepWritable<T>
  }
  if (typeof value === 'object' && value != null) {
    throw new Error('Cannot deep clone non-plain object')
  }
  return value as DeepWritable<T>
}

type MaybeFallback<D, V> = undefined extends V ? Exclude<V, undefined> | D : V

// NOTE(kazupon): copy from typechallenge
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

type MergeWithDefaultsResult<D, V> =
  Equal<D, undefined> extends true
  ? V
  : D extends Function | Array<any>
  ? MaybeFallback<D, V>
  : V extends Function | Array<any>
  ? MaybeFallback<D, V>
  : D extends Record<string, any>
  ? V extends Record<string, any>
  ? {
    [K in keyof D | keyof V]: K extends keyof D
    ? K extends keyof V
    ? MergeWithDefaultsResult<D[K], V[K]>
    : D[K]
    : K extends keyof V
    ? V[K]
    : never
  }
  : MaybeFallback<D, V>
  : MaybeFallback<D, V>

function mergeWithDefaultsRecursively<
  D extends Record<string, any>,
  V extends Record<string, any>,
>(defaults: D, values: V): MergeWithDefaultsResult<D, V> {
  const merged: Record<string, any> = defaults
  for (const key in values) {
    const value = values[key]
    // let null to set the value (e.g. `server.watch: null`)
    if (value === undefined) continue

    const existing = merged[key]
    if (existing === undefined) {
      merged[key] = value
      continue
    }

    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeWithDefaultsRecursively(existing, value)
      continue
    }

    // use replace even for arrays
    merged[key] = value
  }
  return merged as MergeWithDefaultsResult<D, V>
}

const environmentPathRE = /^environments\.[^.]+$/

export function mergeWithDefaults<
  D extends Record<string, any>,
  V extends Record<string, any>,
>(defaults: D, values: V): MergeWithDefaultsResult<DeepWritable<D>, V> {
  // NOTE: we need to clone the value here to avoid mutating the defaults
  const clonedDefaults = deepClone(defaults)
  return mergeWithDefaultsRecursively(clonedDefaults, values)
}

const runtimeDeprecatedPath = new Set(['optimizeDeps', 'ssr.optimizeDeps'])
const rollupOptionsDeprecationCall = (() => {
  return () => {
    const method = import.meta.env.VITE_DEPRECATION_TRACE ? 'trace' : 'warn'
    // NOTE(kazupon): comment out for code maintenance with vite original code syncing
    // const method = process.env.VITE_DEPRECATION_TRACE ? 'trace' : 'warn'
    // eslint-disable-next-line no-console
    console[method](
      '`optimizeDeps.rollupOptions` / `ssr.optimizeDeps.rollupOptions` is deprecated. ' +
      'Use `optimizeDeps.rolldownOptions` instead. Note that this option may be set by a plugin. ' +
      (method === 'trace'
        ? 'Showing trace because VITE_DEPRECATION_TRACE is set.'
        : 'Set VITE_DEPRECATION_TRACE=1 to see where it is called.'),
    )
  }
})()

export function setupRollupOptionCompat<
  T extends Pick<BuildEnvironmentOptions, 'rollupOptions' | 'rolldownOptions'>,
>(
  buildConfig: T,
  path: string,
): asserts buildConfig is T & {
  rolldownOptions: Exclude<T['rolldownOptions'], undefined>
} {
  // if both rollupOptions and rolldownOptions are present,
  // ignore rollupOptions and use rolldownOptions
  // @ts-expect-error -- TODO(kazupon): fix me
  buildConfig.rolldownOptions ??= buildConfig.rollupOptions
  if (
    runtimeDeprecatedPath.has(path) &&
    buildConfig.rollupOptions &&
    buildConfig.rolldownOptions !== buildConfig.rollupOptions
  ) {
    rollupOptionsDeprecationCall()
  }

  // proxy rolldownOptions to rollupOptions
  Object.defineProperty(buildConfig, 'rollupOptions', {
    get() {
      return buildConfig.rolldownOptions
    },
    set(newValue) {
      if (runtimeDeprecatedPath.has(path)) {
        rollupOptionsDeprecationCall()
      }
      buildConfig.rolldownOptions = newValue
    },
    configurable: true,
    enumerable: true,
  })
}

const rollupOptionsRootPaths = new Set([
  'build',
  'worker',
  'optimizeDeps',
  'ssr.optimizeDeps',
])

export function hasBothRollupOptionsAndRolldownOptions(
  options: Record<string, any>,
): boolean {
  for (const opt of [
    options.build,
    options.worker,
    options.optimizeDeps,
    options.ssr?.optimizeDeps,
  ]) {
    if (
      opt != null &&
      opt.rollupOptions != null &&
      opt.rolldownOptions != null
    ) {
      return true
    }
  }
  return false
}

function mergeConfigRecursively(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath: string,
) {
  const merged: Record<string, any> = { ...defaults }
  if (rollupOptionsRootPaths.has(rootPath)) {
    setupRollupOptionCompat(merged, rootPath)
  }

  for (const key in overrides) {
    const value = overrides[key]
    if (value == null) {
      continue
    }

    let existing = merged[key]
    if (key === 'rollupOptions' && rollupOptionsRootPaths.has(rootPath)) {
      // if both rollupOptions and rolldownOptions are present,
      // ignore rollupOptions and use rolldownOptions
      if (overrides.rolldownOptions) continue
      existing = merged.rolldownOptions
    }

    if (existing == null) {
      merged[key] = value
      continue
    }

    // fields that require special handling
    if (key === 'alias' && (rootPath === 'resolve' || rootPath === '')) {
      merged[key] = mergeAlias(existing, value)
      continue
    } else if (key === 'assetsInclude' && rootPath === '') {
      merged[key] = [].concat(existing, value)
      continue
    } else if (
      (((key === 'noExternal' || key === 'external') &&
        (rootPath === 'ssr' || rootPath === 'resolve')) ||
        (key === 'allowedHosts' && rootPath === 'server')) &&
      (existing === true || value === true)
    ) {
      merged[key] = true
      continue
    } else if (key === 'plugins' && rootPath === 'worker') {
      merged[key] = () => [
        ...backwardCompatibleWorkerPlugins(existing),
        ...backwardCompatibleWorkerPlugins(value),
      ]
      continue
    } else if (key === 'server' && rootPath === 'server.hmr') {
      merged[key] = value
      continue
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      merged[key] = [...arraify(existing), ...arraify(value)]
      continue
    }
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        // treat environment.* as root
        rootPath && !environmentPathRE.test(rootPath)
          ? `${rootPath}.${key}`
          : key,
      )
      continue
    }

    merged[key] = value
  }
  return merged
}


export function mergeConfig<
  D extends Record<string, any>,
  O extends Record<string, any>,
>(
  defaults: D extends Function ? never : D,
  overrides: O extends Function ? never : O,
  isRoot = true,
): Record<string, any> {
  if (typeof defaults === 'function' || typeof overrides === 'function') {
    throw new Error(`Cannot merge config in form of callback`)
  }

  return mergeConfigRecursively(defaults, overrides, isRoot ? '' : '.')
}

export function mergeAlias(
  a?: AliasOptions,
  b?: AliasOptions,
): AliasOptions | undefined {
  if (!a) return b
  if (!b) return a
  if (isObject(a) && isObject(b)) {
    return { ...a, ...b }
  }
  // the order is flipped because the alias is resolved from top-down,
  // where the later should have higher priority
  return [...normalizeAlias(b), ...normalizeAlias(a)]
}

export function normalizeAlias(o: AliasOptions = []): Alias[] {
  return Array.isArray(o)
    ? o.map(normalizeSingleAlias)
    : Object.keys(o).map((find) =>
      normalizeSingleAlias({
        find,
        replacement: (o as any)[find],
      }),
    )
}

// https://github.com/vitejs/vite/issues/1363
// work around https://github.com/rollup/plugins/issues/759
function normalizeSingleAlias({
  find,
  replacement,
  customResolver,
}: Alias): Alias {
  if (
    typeof find === 'string' &&
    find.endsWith('/') &&
    replacement.endsWith('/')
  ) {
    find = find.slice(0, find.length - 1)
    replacement = replacement.slice(0, replacement.length - 1)
  }

  const alias: Alias = {
    find,
    replacement,
  }
  if (customResolver) {
    alias.customResolver = customResolver
  }
  return alias
}

/**
 * Transforms transpiled code result where line numbers aren't altered,
 * so we can skip sourcemap generation during dev
 */
export function transformStableResult(
  s: MagicString,
  id: string,
  config: ResolvedConfig,
): TransformResult {
  return {
    code: s.toString(),
    map:
      config.command === 'build' && config.build.sourcemap
        ? s.generateMap({ hires: 'boundary', source: id })
        : null,
  }
}

type AsyncFlatten<T extends unknown[]> = T extends (infer U)[]
  ? Exclude<Awaited<U>, U[]>[]
  : never

export async function asyncFlatten<T extends unknown[]>(
  arr: T,
): Promise<AsyncFlatten<T>> {
  do {
    arr = (await Promise.all(arr)).flat(Infinity) as any
  } while (arr.some((v: any) => v?.then))
  return arr as unknown[] as AsyncFlatten<T>
}

// strip UTF-8 BOM
export function stripBomTag(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1)
  }

  return content
}

// TODO: fill in code later ...

let lastDateNow = 0
/**
 * Similar to `Date.now()`, but strictly monotonically increasing.
 *
 * This function will never return the same value.
 * Thus, the value may differ from the actual time.
 *
 * related: https://github.com/vitejs/vite/issues/19804
 */
export function monotonicDateNow(): number {
  const now = Date.now()
  if (now > lastDateNow) {
    lastDateNow = now
    return lastDateNow
  }

  lastDateNow++
  return lastDateNow
}
