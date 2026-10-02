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

import { init, parse as parseImports } from 'es-module-lexer'
import path from 'node:path'
import type {
  InputOption,
  LogOrStringHandler,
  RolldownOptions,
  RolldownOutput,
  RolldownWatcher
} from 'rolldown'
import { stripLiteral } from 'strip-literal'
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

// The same as the HTML requests of the HTML plugin, which this module does not import
const htmlEntryRE = /\.(?:html|htm)$/

function unsupported(option: string, message: string): BuildProjectLog {
  return { code: UNSUPPORTED_OPTION, message: `[vrowzer] ${option}: ${message}` }
}

/**
 * Check the resolved build options against what the browser build supports.
 *
 * @param options - The resolved build options
 * @param input - The top-level `input` of the resolved config
 * @returns The problems. An empty array when the options are supported.
 */
export function validateBuildOptions(
  options: ResolvedBuildOptions,
  input?: InputOption
): BuildProjectLog[] {
  const problems: BuildProjectLog[] = []
  if (!options.lib) {
    // An app builds one HTML entry. Like `resolveRolldownOptions()`, take `build.rolldownOptions.input`,
    // then the top-level `input`, and `/index.html` without them.
    const option = options.rolldownOptions.input ? 'build.rolldownOptions.input' : 'input'
    const entry = options.rolldownOptions.input || input
    if (entry !== undefined && typeof entry !== 'string') {
      problems.push(unsupported(option, 'only a single HTML entry is supported.'))
    } else if (entry !== undefined && !htmlEntryRE.test(entry)) {
      problems.push(
        unsupported(
          option,
          `the entry of an app must be an HTML file, but got "${entry}". Set build.lib to build a library from it.`
        )
      )
    }
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
      const problems = validateBuildOptions(config.build, config.input)
      if (problems.length > 0) {
        throw new BuildProjectError(problems)
      }
    },
  }
}

/**
 * Create the logger of a build. It collects the warnings and the errors, and drops the other logs.
 *
 * Vite logs some problems as errors without failing the build, e.g. a CSS `@import` that is not
 * found, so they are returned with the warnings. A failed build rejects with its own errors instead.
 *
 * @param warnings - Receives the warnings and the errors
 * @returns The logger
 */
export function createCollectingLogger(warnings: BuildProjectLog[]): Logger {
  const logger = createLogger('silent', { allowClearScreen: false })
  const warned = new Set<string>()
  const loggedErrors = new WeakSet<object>()
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
    error(msg, options) {
      // Vite checks it, so that it does not log an error twice
      if (options?.error) {
        loggedErrors.add(options.error)
      }
      warnings.push({ message: stripAnsi(msg) })
    },
    hasErrorLogged(error) {
      return loggedErrors.has(error)
    },
  }
  return collecting
}

/**
 * The plugin that keeps the details of the warnings of rolldown: the code, the plugin, the module, the
 * location and the code frame. Vite's `onRollupLog()` passes only the message of a warning to the
 * logger.
 *
 * It wraps `build.rolldownOptions.onLog`, and calls the one of the config first, so that Vite's
 * handling of the logs, e.g. the warnings that it ignores, stays the same.
 *
 * @param warnings - The warnings that the collecting logger receives
 * @returns The plugin
 */
export function createBuildLogPlugin(warnings: BuildProjectLog[]): Plugin {
  return {
    name: 'vrowzer:build-log',
    enforce: 'post',
    config(config) {
      const configOnLog = config.build?.rolldownOptions?.onLog
      const onLog: NonNullable<RolldownOptions['onLog']> = (level, log, defaultHandler) => {
        const handler: LogOrStringHandler = (handlerLevel, handlerLog) => {
          const count = warnings.length
          defaultHandler(handlerLevel, handlerLog)
          // Vite logged it as a warning. Keep the message that Vite made, with the details.
          if (handlerLevel === 'warn' && typeof handlerLog === 'object' && warnings.length === count + 1) {
            warnings[count] = { ...toBuildLog(handlerLog), message: warnings[count]!.message }
          }
        }
        if (configOnLog) {
          configOnLog(level, log, handler)
        } else {
          handler(level, log)
        }
      }
      return { build: { rolldownOptions: { onLog } } }
    },
  }
}

const workerQueryRE = /[?&](?:worker|sharedworker)(?:[&=]|$)/
const globRE = /\bimport\.meta\.glob\s*\(/
const workerRE = /\bnew\s+(?:Shared)?Worker\s*\(\s*new\s+URL\s*\(/
// A template string with a variable, or a string concatenation, that starts with a relative path
const variablePathRE = /^\s*(?:`\.\.?\/[^`]*\$\{|(['"])\.\.?\/.*?\1\s*\+)/s
const viteIgnoreRE = /\/\*\s*@vite-ignore\s*\*\//

export const UNSUPPORTED_GLOB_MESSAGE =
  'import.meta.glob() is not supported in builds yet, including the template strings with variables of new URL(..., import.meta.url). The output keeps it, and it fails when it runs.'
export const UNSUPPORTED_VARIABLE_IMPORT_MESSAGE =
  'Dynamic imports with variables in their paths are not supported in builds yet. The build does not include the files that they point to. Add /* @vite-ignore */ to the import to suppress this warning.'
export const UNSUPPORTED_WORKER_MESSAGE =
  'The Workers of the project (new Worker(new URL(...))) are not supported in builds yet. The build emits the file of the Worker as an asset, without bundling or transforming it.'

/**
 * The plugin that reports what builds do not support yet, where it can find it in the modules of the
 * project: `import.meta.glob()`, dynamic imports with variables in their paths and the Workers of the
 * project are warnings, and the `?worker` imports are errors, which fail anyway.
 *
 * It runs after the other plugins, so that it sees JavaScript, and `new URL()` that
 * `vite:asset-import-meta-url` turned into `import.meta.glob()`. The dependencies are not checked.
 *
 * @returns The plugin
 */
export function createUnsupportedFeaturesPlugin(): Plugin {
  return {
    name: 'vrowzer:unsupported-features',
    enforce: 'post',
    resolveId: {
      order: 'pre',
      handler(source) {
        if (workerQueryRE.test(source)) {
          this.error(
            `[vrowzer] The Workers of the project ("${source}") are not supported in builds yet.`
          )
        }
      },
    },
    async transform(code, id) {
      if (id.startsWith('\0') || id.includes('/node_modules/')) {
        return
      }
      const cleaned = stripLiteral(code)
      const glob = globRE.exec(cleaned)
      if (glob) {
        this.warn(UNSUPPORTED_GLOB_MESSAGE, glob.index)
      }
      const worker = workerRE.exec(cleaned)
      if (worker) {
        this.warn(UNSUPPORTED_WORKER_MESSAGE, worker.index)
      }
      if (!cleaned.includes('import(')) {
        return
      }
      await init
      let imports: ReturnType<typeof parseImports>[0]
      try {
        imports = parseImports(code)[0]
      } catch {
        return
      }
      for (const { d, n, s: start, e: end, ss } of imports) {
        // A dynamic import (`d` is its parenthesis) whose path is not a string literal
        if (
          d > -1 &&
          n === undefined &&
          variablePathRE.test(code.slice(start, end)) &&
          !viteIgnoreRE.test(code.slice(d, start))
        ) {
          this.warn(UNSUPPORTED_VARIABLE_IMPORT_MESSAGE, ss)
        }
      }
    },
  }
}

/**
 * Check the sizes of the chunks, as the reporter of Vite does when it writes the outputs. The builder
 * does not write them, so the reporter does not check them.
 *
 * @param result - The result of the build
 * @param options - The resolved build options
 * @returns The warning of the chunks larger than `build.chunkSizeWarningLimit`, if any
 */
export function checkChunkSizes(
  result: RolldownOutput | RolldownOutput[] | RolldownWatcher,
  options: ResolvedBuildOptions
): BuildProjectLog | undefined {
  // The same conditions as the reporter: minified chunks of an app
  if (!options.minify || options.lib || !(Array.isArray(result) || 'output' in result)) {
    return
  }
  const encoder = new TextEncoder()
  const limit = options.chunkSizeWarningLimit
  const large = (Array.isArray(result) ? result : [result])
    .flatMap(output => output.output)
    .some(item => item.type === 'chunk' && encoder.encode(item.code).length / 1000 > limit)
  if (!large) {
    return
  }
  // The message of the reporter of rolldown
  return {
    message:
      `(!) Some chunks are larger than ${limit} kB after minification. Consider:\n` +
      `- Using dynamic import() to code-split the application\n` +
      `- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting\n` +
      `- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.`,
  }
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
  // The native plugins of rolldown report the plugin and the module in the message only, e.g.
  // "[builtin:vite-transform] Unexpected token" with the frame header "╭─[ src/index.ts:1:23 ]".
  // The path is relative to the working directory of the Worker, which is the root. Other errors
  // start with their code instead, e.g. "[PARSE_ERROR]".
  if (log.plugin === undefined && log.code === 'PLUGIN_ERROR') {
    const plugin = nativePluginPattern.exec(log.message)?.[1]
    if (plugin) {
      log.plugin = plugin
    }
  }
  if (log.id === undefined) {
    const file = frameHeaderPattern.exec(log.message)?.[1]
    if (file) {
      log.id = file.startsWith('/') ? file : `/${file}`
    }
  }
  return log
}

const nativePluginPattern = /^\[([^\]\s]+)\] /
const frameHeaderPattern = /╭─\[ ?([^\]\n]+?):\d+:\d+ ?\]/

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
