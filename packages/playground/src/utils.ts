import remapping from '@jridgewell/remapping'
import { createDebug } from 'obug'
import path from 'pathe'
import colors from 'picocolors'
import {
  CLIENT_PUBLIC_PATH,
  CSS_LANGS_RE,
  ENV_PUBLIC_PATH,
  FS_PREFIX,
  VALID_ID_PREFIX
} from './constants.ts'
import { findNearestPackageData } from './packages.ts'
import { createIsBuiltin } from './shared/builtin.ts'
import {
  cleanUrl,
  isWindows,
  slash,
  splitFileAndPostfix,
  withTrailingSlash
} from './shared/utils.ts'

import type { DecodedSourceMap, RawSourceMap } from '@jridgewell/remapping'
import type { Stats } from 'fs'
import type { Debugger } from 'obug'
import type { BuildEnvironmentOptions, FSWatcher } from 'vite'
import type { PackageCache } from './packages.ts'
import type { Alias, AliasOptions, Equal } from './types.ts'

// --- node/server/index.ts --
export interface ResolvedServerUrls {
  local: string[]
  network: string[]
}

// --- utils.ts

/**
 * Inlined to keep `@rollup/pluginutils` in devDependencies
 */
// export type FilterPattern =
//   | ReadonlyArray<string | RegExp>
//   | string
//   | RegExp
//   | null
// export const createFilter = _createFilter as (
//   include?: FilterPattern,
//   exclude?: FilterPattern,
//   options?: { resolve?: string | false | null },
//   // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- FIXME(kazupon): remove redundant type constituents
// ) => (id: string | unknown) => boolean

// export { withFilter } from 'rolldown/filter'

const replaceSlashOrColonRE = /[/:]/g
const replaceDotRE = /\./g
const replaceNestedIdRE = /\s*>\s*/g
const replaceHashRE = /#/g

// export const flattenId = (id: string): string => {
//   const flatId = limitFlattenIdLength(
//     id
//       .replace(replaceSlashOrColonRE, '_')
//       .replace(replaceDotRE, '__')
//       .replace(replaceNestedIdRE, '___')
//       .replace(replaceHashRE, '____'),
//   )
//   return flatId
// }

const FLATTEN_ID_HASH_LENGTH = 8
const FLATTEN_ID_MAX_FILE_LENGTH = 170

// const limitFlattenIdLength = (
//   id: string,
//   limit: number = FLATTEN_ID_MAX_FILE_LENGTH,
// ): string => {
//   if (id.length <= limit) {
//     return id
//   }
//   return id.slice(0, limit - (FLATTEN_ID_HASH_LENGTH + 1)) + '_' + getHash(id)
// }

const normalizeId = (id: string): string => id.replace(replaceNestedIdRE, ' > ')

// Supported by Node, Deno, Bun
const NODE_BUILTIN_NAMESPACE = 'node:'
// Supported by Bun
const BUN_BUILTIN_NAMESPACE = 'bun:'
// Some runtimes like Bun injects namespaced modules here, which is not a node builtin
// FIXME(kazupon):
// const nodeBuiltins = builtinModules.filter((id) => !id.includes(':'))
const nodeBuiltins = [] as string[]

const isBuiltinCache = new WeakMap<
  (string | RegExp)[],
  (id: string, importer?: string) => boolean
>()

export function isBuiltin(builtins: (string | RegExp)[], id: string): boolean {
  let isBuiltin = isBuiltinCache.get(builtins)
  if (!isBuiltin) {
    isBuiltin = createIsBuiltin(builtins)
    isBuiltinCache.set(builtins, isBuiltin)
  }
  return isBuiltin(id)
}

export const nodeLikeBuiltins: (string | RegExp)[] = [
  ...nodeBuiltins,
  new RegExp(`^${NODE_BUILTIN_NAMESPACE}`),
  new RegExp(`^${BUN_BUILTIN_NAMESPACE}`)
]

// export function isNodeLikeBuiltin(id: string): boolean {
//   return isBuiltin(nodeLikeBuiltins, id)
// }

// export function isNodeBuiltin(id: string): boolean {
//   if (id.startsWith(NODE_BUILTIN_NAMESPACE)) return true
//   return nodeBuiltins.includes(id)
// }

export function isInNodeModules(id: string): boolean {
  return id.includes('node_modules')
}

function moduleListContains(moduleList: string[] | undefined, id: string): boolean | undefined {
  return moduleList?.some(m => m === id || id.startsWith(withTrailingSlash(m)))
}

// export function isOptimizable(
//   id: string,
//   optimizeDeps: DepOptimizationOptions,
// ): boolean {
//   const { extensions } = optimizeDeps
//   return (
//     OPTIMIZABLE_ENTRY_RE.test(id) ||
//     (extensions?.some((ext) => id.endsWith(ext)) ?? false)
//   )
// }

const bareImportRE: RegExp = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/
const deepImportRE: RegExp = /^([^@][^/]*)\/|^(@[^/]+\/[^/]+)\//

// export const _dirname: string = path.dirname(
//   fileURLToPath(/** #__KEEP__ */ import.meta.url),
// )

// https://github.com/rolldown/rolldown/blob/62fba31428af244f871f0e119ed43936ee5d01fd/packages/rolldown/src/log/logger.ts#L64
const rollupVersion = '4.23.0'
// export { VERSION as rolldownVersion } from 'rolldown'

// set in bin/vite.js
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): fix
const filter = import.meta.env.VITE_DEBUG_FILTER
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): fix
const DEBUG = import.meta.env.DEBUG

interface DebuggerOptions {
  onlyWhenFocused?: boolean | string
  depth?: number
}

type ViteDebugScope = `vite:${string}`

export function createDebugger(
  namespace: ViteDebugScope,
  options: DebuggerOptions = {}
): Debugger['log'] | undefined {
  // NOTE(kazupon): using debug from obug
  // const log = debug(namespace)
  const log = createDebug(namespace)
  const { onlyWhenFocused, depth } = options

  if (depth && log.inspectOpts && log.inspectOpts.depth == null) {
    log.inspectOpts.depth = options.depth
  }

  let enabled = log.enabled
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
    enabled = !!DEBUG?.includes(ns)
  }

  if (enabled) {
    return (...args: [string, ...any[]]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
      if (!filter || args.some(a => a?.includes?.(filter))) {
        log(...args)
      }
    }
  }
}

// TODO(kazupon):
// function testCaseInsensitiveFS() {
//   if (!CLIENT_ENTRY.endsWith('client.mjs')) {
//     throw new Error(
//       `cannot test case insensitive FS, CLIENT_ENTRY const doesn't contain client.mjs`,
//     )
//   }
//   if (!fs.existsSync(CLIENT_ENTRY)) {
//     throw new Error(
//       'cannot test case insensitive FS, CLIENT_ENTRY does not point to an existing file: ' +
//       CLIENT_ENTRY,
//     )
//   }
//   return fs.existsSync(CLIENT_ENTRY.replace('client.mjs', 'cLiEnT.mjs'))
// }
//
// export const isCaseInsensitiveFS: boolean = testCaseInsensitiveFS()
const isCaseInsensitiveFS: boolean = false

const VOLUME_RE = /^[A-Z]:/i

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

function fsPathFromId(id: string): string {
  const fsPath = normalizePath(id.startsWith(FS_PREFIX) ? id.slice(FS_PREFIX.length) : id)
  return fsPath[0] === '/' || VOLUME_RE.test(fsPath) ? fsPath : `/${fsPath}`
}

function fsPathFromUrl(url: string): string {
  return fsPathFromId(cleanUrl(url))
}

/**
 * Check if dir is a parent of file
 *
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param dir - normalized absolute path
 * @param file - normalized absolute path
 * @returns true if dir is a parent of file
 */
export function isParentDirectory(dir: string, file: string): boolean {
  dir = withTrailingSlash(dir)
  return (
    file.startsWith(dir) ||
    (isCaseInsensitiveFS && file.toLowerCase().startsWith(dir.toLowerCase()))
  )
}

/**
 * Check if 2 file name are identical
 *
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param file1 - normalized absolute path
 * @param file2 - normalized absolute path
 * @returns true if both files url are identical
 */
export function isSameFilePath(file1: string, file2: string): boolean {
  return file1 === file2 || (isCaseInsensitiveFS && file1.toLowerCase() === file2.toLowerCase())
}

const externalRE: RegExp = /^([a-z]+:)?\/\//
export const isExternalUrl = (url: string): boolean => externalRE.test(url)

const dataUrlRE: RegExp = /^\s*data:/i
const isDataUrl = (url: string): boolean => dataUrlRE.test(url)

const virtualModuleRE: RegExp = /^virtual-module:.*/
const virtualModulePrefix = 'virtual-module:'

// NOTE: We should start relying on the "Sec-Fetch-Dest" header instead of this
// hardcoded list. We can eventually remove this function when the minimum version
// of browsers we support in dev all support this header.
const knownJsSrcRE = /\.(?:[jt]sx?|m[jt]s|vue|marko|svelte|astro|imba|mdx)(?:$|\?)/
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

export const isCSSRequest = (request: string): boolean => CSS_LANGS_RE.test(request)

const importQueryRE = /(\?|&)import=?(?:&|$)/
const directRequestRE = /(\?|&)direct=?(?:&|$)/
const internalPrefixes = [FS_PREFIX, VALID_ID_PREFIX, CLIENT_PUBLIC_PATH, ENV_PUBLIC_PATH]
const InternalPrefixRE = new RegExp(`^(?:${internalPrefixes.join('|')})`)
const trailingSeparatorRE = /[?&]$/
const isImportRequest = (url: string): boolean => importQueryRE.test(url)
const isInternalRequest = (url: string): boolean => InternalPrefixRE.test(url)

export function removeImportQuery(url: string): string {
  return url.replace(importQueryRE, '$1').replace(trailingSeparatorRE, '')
}
function removeDirectQuery(url: string): string {
  return url.replace(directRequestRE, '$1').replace(trailingSeparatorRE, '')
}

const urlRE: RegExp = /(\?|&)url(?:&|$)/
const rawRE: RegExp = /(\?|&)raw(?:&|$)/
function removeUrlQuery(url: string): string {
  return url.replace(urlRE, '$1').replace(trailingSeparatorRE, '')
}
function removeRawQuery(url: string): string {
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

async function asyncReplace(
  input: string,
  re: RegExp,
  replacer: (match: RegExpExecArray) => string | Promise<string>
): Promise<string> {
  let match: RegExpExecArray | null
  let remaining = input
  let rewritten = ''
  while ((match = re.exec(remaining))) {
    rewritten += remaining.slice(0, match.index)
    rewritten += await replacer(match)
    remaining = remaining.slice(match.index + match[0].length)
  }
  rewritten += remaining
  return rewritten
}

export function timeFrom(start: number, subtract = 0): string {
  const time: number | string = performance.now() - start - subtract
  const timeString = (time.toFixed(2) + `ms`).padEnd(5, ' ')
  if (time < 10) {
    return colors.green(timeString)
  } else if (time < 50) {
    return colors.yellow(timeString)
  } else {
    return colors.red(timeString)
  }
}

/**
 * pretty url for logging.
 */
export function prettifyUrl(url: string, root: string): string {
  url = removeTimestampQuery(url)
  const isAbsoluteFile = url.startsWith(root)
  if (isAbsoluteFile || url.startsWith(FS_PREFIX)) {
    const file = path.posix.relative(root, isAbsoluteFile ? url : fsPathFromId(url))
    return colors.dim(file)
  } else {
    return colors.dim(url)
  }
}

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value != null
}

// export function tryStatSync(file: string): fs.Stats | undefined {
export function tryStatSync(file: string): Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    // TODO(kazupon): use virtual fs
    // return fs.statSync(file, { throwIfNoEntry: false })
    return {
      isFile: () => false,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false
    } as Stats
  } catch {
    // Ignore errors
  }
}

// export function lookupFile(
//   dir: string,
//   fileNames: string[],
// ): string | undefined {
//   while (dir) {
//     for (const fileName of fileNames) {
//       const fullPath = path.join(dir, fileName)
//       if (tryStatSync(fullPath)?.isFile()) return fullPath
//     }
//     const parentDir = path.dirname(dir)
//     if (parentDir === dir) return
//
//     dir = parentDir
//   }
// }

export function isFilePathESM(filePath: string, packageCache?: PackageCache): boolean {
  if (/\.m[jt]s$/.test(filePath)) {
    return true
  } else if (/\.c[jt]s$/.test(filePath)) {
    return false
  } else {
    // check package.json for type: "module"
    try {
      const pkg = findNearestPackageData(path.dirname(filePath), packageCache)
      return pkg?.data.type === 'module'
    } catch {
      return false
    }
  }
}

const splitRE: RegExp = /\r?\n/g

const range: number = 2

export function pad(source: string, n = 2): string {
  const lines = source.split(splitRE)
  return lines.map(l => ` `.repeat(n) + l).join(`\n`)
}

type Pos = {
  /** 1-based */
  line: number
  /** 0-based */
  column: number
}

function posToNumber(source: string, pos: number | Pos): number {
  if (typeof pos === 'number') return pos
  const lines = source.split(splitRE)
  const { line, column } = pos
  let start = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    // @ts-expect-error -- FIXME(kazupon):
    start += lines[i].length + 1
  }
  return start + column
}

export function numberToPos(source: string, offset: number | Pos): Pos {
  if (typeof offset !== 'number') return offset
  if (offset > source.length) {
    throw new Error(
      `offset is longer than source length! offset ${offset} > length ${source.length}`
    )
  }

  const lines = source.slice(0, offset).split(splitRE)
  return {
    line: lines.length,
    // @ts-expect-error -- FIXME(kazupon):
    column: lines[lines.length - 1].length
  }
}

const MAX_DISPLAY_LEN = 120
const ELLIPSIS = '...'

export function generateCodeFrame(
  source: string,
  start: number | Pos = 0,
  end?: number | Pos
): string {
  start = Math.max(posToNumber(source, start), 0)
  end = Math.min(end !== undefined ? posToNumber(source, end) : start, source.length)
  const lastPosLine =
    end !== undefined ? numberToPos(source, end).line : numberToPos(source, start).line + range
  const lineNumberWidth = Math.max(3, String(lastPosLine).length + 1)
  const lines = source.split(splitRE)
  let count = 0
  const res: string[] = []
  for (let i = 0; i < lines.length; i++) {
    // @ts-expect-error -- FIXME(kazupon):
    count += lines[i].length
    if (count >= start) {
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        // @ts-expect-error -- FIXME(kazupon):
        const lineLength = lines[j].length
        const pad = Math.max(start - (count - lineLength), 0)
        const underlineLength = Math.max(1, end > count ? lineLength - pad : end - start)

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
            underlinePad = Math.max(0, pad - startIdx) + (startIdx > 0 ? ELLIPSIS.length : 0)
          }
          const prefix = startIdx > 0 ? ELLIPSIS : ''
          const suffix = lineLength - startIdx > MAX_DISPLAY_LEN ? ELLIPSIS : ''
          const sliceLen = MAX_DISPLAY_LEN - prefix.length - suffix.length
          displayLine =
            // @ts-expect-error -- FIXME(kazupon):
            prefix + displayLine.slice(startIdx, startIdx + sliceLen) + suffix
        }
        res.push(`${line}${' '.repeat(lineNumberWidth - String(line).length)}|  ${displayLine}`)
        if (j === i) {
          // push underline
          const underline = '^'.repeat(Math.min(underlineLength, MAX_DISPLAY_LEN))
          res.push(`${' '.repeat(lineNumberWidth)}|  ` + ' '.repeat(underlinePad) + underline)
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

// ---

export function ensureWatchedFile(watcher: FSWatcher, file: string | null, root: string): void {
  if (
    file &&
    // only need to watch if out of root
    !file.startsWith(withTrailingSlash(root)) &&
    // some rollup plugins use null bytes for private resolved Ids
    !file.includes('\0') // &&
    // TODO(kazupon): use virtual fs
    // fs.existsSync(file)
  ) {
    // resolve file to normalized system path
    watcher.add(path.resolve(file))
  }
}

// ---

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
  version: 3
}
/**
 * Combines multiple sourcemaps into a single sourcemap.
 * Note that the length of sourcemapList must be 2.
 */
export function combineSourcemaps(
  filename: string,
  sourcemapList: Array<DecodedSourceMap | RawSourceMap>
): RawSourceMap {
  if (sourcemapList.length === 0 || sourcemapList.every(m => m.sources.length === 0)) {
    return { ...nullSourceMap }
  }

  // hack for parse broken with normalized absolute paths on windows (C:/path/to/something).
  // escape them to linux like paths
  // also avoid mutation here to prevent breaking plugin's using cache to generate sourcemaps like vue (see #7442)
  sourcemapList = sourcemapList.map(sourcemap => {
    const newSourcemaps = { ...sourcemap }
    newSourcemaps.sources = sourcemap.sources.map(source =>
      source ? escapeToLinuxLikePath(source) : null
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
    sourcemapList.slice(0, -1).find(m => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null)
  } else {
    // @ts-expect-error -- FIXME(kazupon): types
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
  map.sources = map.sources.map(source => (source ? unescapeToLinuxLikePath(source) : source))
  map.file = filename

  return map as RawSourceMap
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export function arraify<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target]
}

// Taken from https://stackoverflow.com/a/36328890
const multilineCommentsRE: RegExp = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g
const singlelineCommentsRE: RegExp = /\/\/.*/g
const requestQuerySplitRE: RegExp = /\?(?!.*[/|}])/
const requestQueryMaybeEscapedSplitRE: RegExp = /\\?\?(?!.*[/|}])/

export const blankReplacer = (match: string): string => ' '.repeat(match.length)

// export function getHash(text: Buffer | string, length = 8): string {
//   const h = crypto.hash('sha256', text, 'hex').substring(0, length)
//   if (length <= 64) return h
//   return h.padEnd(length, '_')
// }

function emptyCssComments(raw: string): string {
  return raw.replace(multilineCommentsRE, blankReplacer)
}

function backwardCompatibleWorkerPlugins(plugins: any) {
  if (Array.isArray(plugins)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- FIXME(kazupon): types
    return plugins
  }
  if (typeof plugins === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- FIXME(kazupon): types
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

function deepClone<T>(value: T): DeepWritable<T> {
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- FIXME(kazupon): types
    return value.map(v => deepClone(v)) as DeepWritable<T>
  }
  if (isObject(value)) {
    const cloned: Record<string, any> = {}
    for (const key in value) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
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

function mergeWithDefaultsRecursively<D extends Record<string, any>, V extends Record<string, any>>(
  defaults: D,
  values: V
): MergeWithDefaultsResult<D, V> {
  const merged: Record<string, any> = defaults
  for (const key in values) {
    const value = values[key]
    // let null to set the value (e.g. `server.watch: null`)
    if (value === undefined) continue

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
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

export function mergeWithDefaults<D extends Record<string, any>, V extends Record<string, any>>(
  defaults: D,
  values: V
): MergeWithDefaultsResult<DeepWritable<D>, V> {
  // NOTE: we need to clone the value here to avoid mutating the defaults
  const clonedDefaults = deepClone(defaults)
  return mergeWithDefaultsRecursively(clonedDefaults, values)
}

const runtimeDeprecatedPath = new Set(['optimizeDeps', 'ssr.optimizeDeps'])
const rollupOptionsDeprecationCall = (() => {
  return () => {
    // const method = process.env.VITE_DEPRECATION_TRACE ? 'trace' : 'warn'
    const method = import.meta.env.VITE_DEPRECATION_TRACE ? 'trace' : 'warn'

    console[method](
      '`optimizeDeps.rollupOptions` / `ssr.optimizeDeps.rollupOptions` is deprecated. ' +
        'Use `optimizeDeps.rolldownOptions` instead. Note that this option may be set by a plugin. ' +
        (method === 'trace'
          ? 'Showing trace because VITE_DEPRECATION_TRACE is set.'
          : 'Set VITE_DEPRECATION_TRACE=1 to see where it is called.')
    )
  }
})()

export function setupRollupOptionCompat<
  T extends Pick<BuildEnvironmentOptions, 'rollupOptions' | 'rolldownOptions'>
>(
  buildConfig: T,
  path: string
): asserts buildConfig is T & {
  rolldownOptions: Exclude<T['rolldownOptions'], undefined>
} {
  // if both rollupOptions and rolldownOptions are present,
  // ignore rollupOptions and use rolldownOptions
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
      buildConfig.rolldownOptions = newValue
    },
    configurable: true,
    enumerable: true
  })
}

const rollupOptionsRootPaths = new Set(['build', 'worker', 'optimizeDeps', 'ssr.optimizeDeps'])

export function hasBothRollupOptionsAndRolldownOptions(options: Record<string, any>): boolean {
  for (const opt of [
    options.build,
    options.worker,
    options.optimizeDeps,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
    options.ssr?.optimizeDeps
  ]) {
    if (
      opt != null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
      opt.rollupOptions != null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
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
  rootPath: string
) {
  const merged: Record<string, any> = { ...defaults }
  if (rollupOptionsRootPaths.has(rootPath)) {
    setupRollupOptionCompat(merged, rootPath)
  }

  for (const key in overrides) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
    const value = overrides[key]
    if (value == null) {
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
    let existing = merged[key]
    if (key === 'rollupOptions' && rollupOptionsRootPaths.has(rootPath)) {
      // if both rollupOptions and rolldownOptions are present,
      // ignore rollupOptions and use rolldownOptions
      if (overrides.rolldownOptions) continue
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
      existing = merged.rolldownOptions
    }

    if (existing == null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
      merged[key] = value
      continue
    }

    // fields that require special handling
    if (key === 'alias' && (rootPath === 'resolve' || rootPath === '')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- FIXME(kazupon): types
      merged[key] = mergeAlias(existing, value)
      continue
    } else if (key === 'assetsInclude' && rootPath === '') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- FIXME(kazupon): types
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- FIXME(kazupon): types
      merged[key] = () => [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
        ...backwardCompatibleWorkerPlugins(existing),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
        ...backwardCompatibleWorkerPlugins(value)
      ]
      continue
    } else if (key === 'server' && rootPath === 'server.hmr') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
      merged[key] = value
      continue
    }

    if (Array.isArray(existing) || Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
      merged[key] = [...arraify(existing), ...arraify(value)]
      continue
    }
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursively(
        existing,
        value,
        // treat environment.* as root
        rootPath && !environmentPathRE.test(rootPath) ? `${rootPath}.${key}` : key
      )
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
    merged[key] = value
  }
  return merged
}

export function mergeConfig<D extends Record<string, any>, O extends Record<string, any>>(
  defaults: D extends Function ? never : D,
  overrides: O extends Function ? never : O,
  isRoot = true
): Record<string, any> {
  if (typeof defaults === 'function' || typeof overrides === 'function') {
    throw new Error(`Cannot merge config in form of callback`)
  }

  return mergeConfigRecursively(defaults, overrides, isRoot ? '' : '.')
}

export function mergeAlias(a?: AliasOptions, b?: AliasOptions): AliasOptions | undefined {
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
    : Object.keys(o).map(find =>
        normalizeSingleAlias({
          find,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- FIXME(kazupon): types
          replacement: (o as any)[find]
        })
      )
}

// https://github.com/vitejs/vite/issues/1363
// work around https://github.com/rollup/plugins/issues/759
function normalizeSingleAlias({ find, replacement, customResolver }: Alias): Alias {
  if (typeof find === 'string' && find.endsWith('/') && replacement.endsWith('/')) {
    find = find.slice(0, find.length - 1)
    replacement = replacement.slice(0, replacement.length - 1)
  }

  const alias: Alias = {
    find,
    replacement
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
// export function transformStableResult(
//   s: MagicString,
//   id: string,
//   config: ResolvedConfig,
// ): TransformResult {
//   return {
//     code: s.toString(),
//     map:
//       config.command === 'build' && config.build.sourcemap
//         ? s.generateMap({ hires: 'boundary', source: id })
//         : null,
//   }
// }

type AsyncFlatten<T extends unknown[]> = T extends (infer U)[] ? Exclude<Awaited<U>, U[]>[] : never

export async function asyncFlatten<T extends unknown[]>(arr: T): Promise<AsyncFlatten<T>> {
  do {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FiX(kazupon): fix
    arr = (await Promise.all(arr)).flat(Infinity) as any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- FiX(kazupon): fix
  } while (arr.some((v: any) => v?.then))
  return arr as unknown[] as AsyncFlatten<T>
}

// ---

export function stripBase(path: string, base: string): string {
  if (path === base) {
    return '/'
  }
  const devBase = withTrailingSlash(base)
  return path.startsWith(devBase) ? path.slice(devBase.length - 1) : path
}

// ---

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
