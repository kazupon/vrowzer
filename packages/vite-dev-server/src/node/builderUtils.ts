/**
 * Helpers of the builder: options, outputs, errors and warnings
 *
 * vrowzer-only module, not in upstream Vite. These helpers do not load rolldown, so that unit tests
 * can run them in Node.
 *
 * @module node/builderUtils
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import path from 'node:path'
import type { RolldownOutput, RolldownWatcher } from 'rolldown'
import { withTrailingSlash } from '../shared/utils'
import type { ResolvedBuildOptions } from './build'
import type { ResolvedConfig } from './config'
import { createLogger } from './logger'
import type { Logger } from './logger'
import type { Plugin } from './plugin'
import { normalizePath } from './utils'

/**
 * A log of the builder: an error or a warning
 */
export interface BuildProjectLog {
  message: string
  code?: string
  plugin?: string
  id?: string
  loc?: { line: number; column: number; file?: string }
  frame?: string
}

/**
 * The result of {@link buildProject}
 */
export interface BuildProjectResult {
  /**
   * The outputs, keyed by the path from the output root. Binary assets are ArrayBuffers.
   */
  files: Record<string, string | ArrayBuffer>
  warnings: BuildProjectLog[]
}

/**
 * The error of a failed build, with the structured logs of the failure
 */
export class BuildProjectError extends Error {
  readonly errors: BuildProjectLog[]

  constructor(errors: BuildProjectLog[]) {
    super(errors[0]?.message ?? 'Build failed')
    this.name = 'BuildProjectError'
    this.errors = errors
  }
}

export const UNSUPPORTED_OPTION = 'VROWZER_UNSUPPORTED_OPTION'
export const INVALID_OUTPUT_PATH = 'VROWZER_INVALID_OUTPUT_PATH'
export const PUBLIC_FILE_COLLISION = 'VROWZER_PUBLIC_FILE_COLLISION'

const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

export function stripAnsi(text: string): string {
  return text.replace(ansiPattern, '')
}

function unsupported(option: string, message: string): BuildProjectLog {
  return { code: UNSUPPORTED_OPTION, message: `[vrowzer] ${option}: ${message}` }
}

/**
 * Check the resolved build options against what the browser build supports.
 *
 * @param options - The resolved build options
 * @returns The problems. An empty array when the options are supported.
 */
export function validateBuildOptions(options: ResolvedBuildOptions): BuildProjectLog[] {
  const problems: BuildProjectLog[] = []
  if (!options.lib) {
    problems.push(
      unsupported('build.lib', 'HTML app builds are not supported yet. Set build.lib to build a library.')
    )
  } else {
    const formats = options.lib.formats ?? ['es']
    const others = formats.filter(format => format !== 'es')
    if (others.length > 0) {
      problems.push(
        unsupported(
          'build.lib.formats',
          `only "es" is supported, but got ${others.map(format => `"${format}"`).join(', ')}.`
        )
      )
    }
    // An undefined entry is left to Vite, which reports it
    if (options.lib.entry !== undefined && typeof options.lib.entry !== 'string') {
      problems.push(unsupported('build.lib.entry', 'only a single entry is supported.'))
    }
  }
  if (options.minify === 'terser' || options.minify === 'esbuild') {
    problems.push(
      unsupported('build.minify', `"${options.minify}" is not supported. Use "oxc" or false.`)
    )
  }
  if (options.watch) {
    problems.push(unsupported('build.watch', 'the watch mode is not supported.'))
  }
  if (options.ssr) {
    problems.push(unsupported('build.ssr', 'SSR builds are not supported.'))
  }
  if (options.manifest) {
    problems.push(unsupported('build.manifest', 'manifest files are not supported yet.'))
  }
  if (options.ssrManifest) {
    problems.push(unsupported('build.ssrManifest', 'SSR builds are not supported.'))
  }
  if (options.license) {
    problems.push(unsupported('build.license', 'license files are not supported yet.'))
  }
  return problems
}

/**
 * The plugin that applies the defaults of the browser build, and rejects what it does not support.
 *
 * It runs after the plugins of the Worker config, so that it sees the options they set.
 *
 * @param state - Receives the resolved config
 * @returns The plugin
 */
export function createBuildOptionsPlugin(state: { config?: ResolvedConfig }): Plugin {
  return {
    name: 'vrowzer:build-options',
    enforce: 'post',
    config(config) {
      // `build.cssMinify` resolves to `true` by default, while CSS minification does nothing in the
      // browser build. Reject only the option that the config sets.
      if (config.build?.cssMinify) {
        throw new BuildProjectError([
          unsupported('build.cssMinify', 'CSS minification is not supported in the browser build yet.'),
        ])
      }
      // The browser build supports the `es` format only, so default to it instead of
      // upstream's `['es', 'umd']`
      const lib = config.build?.lib
      if (lib && lib.formats === undefined) {
        return { build: { lib: { formats: ['es'] } } }
      }
    },
    configResolved(config) {
      state.config = config
      const problems = validateBuildOptions(config.build)
      if (problems.length > 0) {
        throw new BuildProjectError(problems)
      }
    },
  }
}

/**
 * Create the logger of a build. It collects the warnings, and drops the other logs.
 *
 * @param warnings - Receives the warnings
 * @returns The logger
 */
export function createCollectingLogger(warnings: BuildProjectLog[]): Logger {
  const logger = createLogger('silent', { allowClearScreen: false })
  const warned = new Set<string>()
  const collecting: Logger = {
    ...logger,
    warn(msg) {
      collecting.hasWarned = true
      warnings.push({ message: stripAnsi(msg) })
    },
    warnOnce(msg) {
      if (warned.has(msg)) {
        return
      }
      warned.add(msg)
      collecting.warn(msg)
    },
  }
  return collecting
}

function toArrayBuffer(source: Uint8Array): ArrayBuffer {
  // The buffer can be shared, or larger than the source
  return source.buffer instanceof ArrayBuffer &&
    source.byteOffset === 0 &&
    source.byteLength === source.buffer.byteLength
    ? source.buffer
    : source.slice().buffer
}

function assertOutputPath(fileName: string): void {
  const normalized = path.posix.normalize(fileName)
  if (
    path.posix.isAbsolute(normalized) ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new BuildProjectError([
      {
        code: INVALID_OUTPUT_PATH,
        message: `[vrowzer] The output ${fileName} is outside the output directory.`,
      },
    ])
  }
}

/**
 * Collect the outputs of a build.
 *
 * @param result - The result of `build()`
 * @returns The outputs, keyed by the path from the output root
 */
export function collectOutputs(
  result: RolldownOutput | RolldownOutput[] | RolldownWatcher
): Record<string, string | ArrayBuffer> {
  if (!Array.isArray(result) && !('output' in result)) {
    throw new BuildProjectError([{ message: '[vrowzer] The build did not return outputs.' }])
  }
  const files: Record<string, string | ArrayBuffer> = {}
  for (const output of Array.isArray(result) ? result : [result]) {
    for (const item of output.output) {
      assertOutputPath(item.fileName)
      if (item.type === 'chunk') {
        files[item.fileName] = item.code
      } else {
        files[item.fileName] =
          typeof item.source === 'string' ? item.source : toArrayBuffer(item.source)
      }
    }
  }
  return files
}

/**
 * Add the public files of the snapshot to the outputs.
 *
 * Vite copies the public directory only when it writes the bundle (`vite:prepare-out-dir`), and the
 * builder does not write it.
 *
 * @param files - The outputs, which receive the public files
 * @param snapshot - The project files, keyed by absolute path
 * @param config - The resolved config
 */
export function addPublicFiles(
  files: Record<string, string | ArrayBuffer>,
  snapshot: Record<string, string | ArrayBuffer>,
  config: Pick<ResolvedConfig, 'publicDir'> & { build: Pick<ResolvedBuildOptions, 'copyPublicDir'> }
): void {
  if (!config.build.copyPublicDir || !config.publicDir) {
    return
  }
  const publicDir = withTrailingSlash(normalizePath(config.publicDir))
  for (const [filePath, content] of Object.entries(snapshot)) {
    if (!filePath.startsWith(publicDir)) {
      continue
    }
    const fileName = filePath.slice(publicDir.length)
    if (Object.hasOwn(files, fileName)) {
      throw new BuildProjectError([
        {
          code: PUBLIC_FILE_COLLISION,
          message: `[vrowzer] The public file ${filePath} has the same path as the output ${fileName}.`,
        },
      ])
    }
    files[fileName] = typeof content === 'string' ? content : content.slice(0)
  }
}

function toBuildLog(error: unknown): BuildProjectLog {
  if (typeof error !== 'object' || error === null) {
    return { message: String(error) }
  }
  const e = error as {
    message?: unknown
    code?: unknown
    plugin?: unknown
    id?: unknown
    loc?: { line?: unknown; column?: unknown; file?: unknown }
    frame?: unknown
  }
  const log: BuildProjectLog = { message: stripAnsi(String(e.message ?? error)) }
  if (typeof e.code === 'string') {
    log.code = e.code
  }
  if (typeof e.plugin === 'string') {
    log.plugin = e.plugin
  }
  if (typeof e.id === 'string') {
    log.id = e.id
  }
  if (e.loc && typeof e.loc.line === 'number' && typeof e.loc.column === 'number') {
    log.loc = { line: e.loc.line, column: e.loc.column }
    if (typeof e.loc.file === 'string') {
      log.loc.file = e.loc.file
    }
  }
  if (typeof e.frame === 'string') {
    log.frame = stripAnsi(e.frame)
  }
  return log
}

/**
 * Convert a failure of a build into a {@link BuildProjectError}.
 *
 * rolldown reports the errors of a build in `errors`. Other failures become one log.
 *
 * @param error - The thrown value
 * @returns The error with the structured logs
 */
export function toBuildProjectError(error: unknown): BuildProjectError {
  if (error instanceof BuildProjectError) {
    return error
  }
  const errors = (error as { errors?: unknown } | null)?.errors
  return new BuildProjectError(
    Array.isArray(errors) && errors.length > 0 ? errors.map(toBuildLog) : [toBuildLog(error)]
  )
}
