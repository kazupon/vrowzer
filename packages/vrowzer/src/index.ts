/**
 * Vrowzer - Preview with Vite HMR flavor for the browser
 *
 * @example
 * ```ts
 * import { Vrowzer } from 'vrowzer'
 *
 * const vrowzer = Vrowzer()
 *
 * // Initialize with files
 * const ready = await vrowzer.ready({
 *   files: {
 *     '/main.js': `
 *       document.getElementById('app').innerHTML = '<h1>Hello!</h1>'
 *       if (import.meta.hot) { import.meta.hot.accept() }
 *     `
 *   }
 * })
 *
 * if (ready) {
 *   // Mount preview iframe into a container element
 *   vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
 * }
 *
 * // Update files (triggers HMR). The promise resolves when later preview requests see the change.
 * await vrowzer.updateFile(
 *   '/main.js',
 *   `
 *   document.getElementById('app').innerHTML = '<h1>Updated!</h1>'
 *   if (import.meta.hot) { import.meta.hot.accept() }
 * `
 * )
 * ```
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Emitter } from '@kazupon/jts-utils/event'
import { V_FS_ACK, createFileSystemPublisher } from '@vrowzer/fs/watcher'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_SETUP_ERROR,
  V_WW_CONNECT_PORT,
  V_SW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_SW_CONNECT_PORT_ACK,
  V_SW_INSTANCE_STARTED,
  V_WW_DISCONNECT_PORT
} from '@vrowzer/vite-dev-server/messages'
import { abortable } from './abort.ts'
import { V_BW_BUILD, V_BW_READY, V_BW_RESULT } from './build-messages.ts'
import {
  getServiceWorker,
  getController,
  getServiceWorkerInstanceId,
  initServiceWorker
} from './controller.ts'
import { resolvePreviewBasePath } from './preview-base.ts'
import { resolveServiceWorkerScope } from './service-worker-scope.ts'
import { resolveServiceWorkerVersion, withServiceWorkerVersion } from './service-worker-version.ts'

import type { Emittable } from '@kazupon/jts-utils/event/emitter'
import type { FileSystemPublisher } from '@vrowzer/fs/watcher'
import type { DisconnectWebWorkerPortMessage } from '@vrowzer/vite-dev-server/messages'
import type { BuildWorkerBuildMessage, BuildWorkerResultMessage } from './build-messages.ts'
import type { SvcWorkerControllerEventMap } from '@vrowzer/service-worker/controller'

const DEFAULT_SERVICE_WORKER_READY_TIMEOUT = 60_000
const DEFAULT_WEB_WORKER_SETUP_TIMEOUT = 90_000
const DEFAULT_FILE_SYNC_TIMEOUT = 10_000
const DEFAULT_BUILD_TIMEOUT = 120_000
/**
 * How long a closed build Worker may take to stop. Chromium stops a Worker thread that does not
 * answer `terminate()` after 2 seconds, and a build Worker keeps a thread of rolldown that long.
 */
const BUILD_WORKER_STOP_TIME = 2500
/**
 * How many closed build Workers may be stopping at once. When too many of them stay, the
 * WebAssembly of a new build Worker cannot start, and the build never ends.
 */
const MAX_STOPPING_BUILD_WORKERS = 4

/**
 * `true` when `@vrowzer/vite-plugin` enables {@link Vrowzer.build} with its `build` option.
 */
declare const __VROWZER_INTERNAL_BUILD__: boolean

function isBuildEnabled(): boolean {
  return typeof __VROWZER_INTERNAL_BUILD__ === 'boolean' && __VROWZER_INTERNAL_BUILD__
}

/**
 * The `/index.html` used when the files given to `ready()` have none. It loads `/main.js` as a
 * module script, with an empty `#app` element to render into.
 */
const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>
`

/**
 * `postMessage()` type used by the preview bootstrap to report load failures to the host.
 */
const PREVIEW_LOAD_ERROR_MESSAGE_TYPE = 'vrowzer:preview-load-error'
const PREVIEW_LOAD_ERROR_MESSAGE_MAX_LENGTH = 1000
const PREVIEW_LOAD_ERROR_URL_MAX_LENGTH = 2048
const PREVIEW_LOAD_ERROR_NAME_MAX_LENGTH = 100

type ReadyState = 'idle' | 'initializing' | 'ready' | 'failed' | 'disposed'

type FileOperation = 'addFile' | 'updateFile' | 'deleteFile'

/**
 * VrowzerOptions defines the configuration options for {@link Vrowzer}.
 */
export interface VrowzerOptions {
  /**
   * The pathname that the preview URLs start with.
   *
   * The previews of each instance load from its own path under it, e.g.
   * `/__preview__/0123456789ab/`, which {@link Vrowzer.previewBasePath} returns. The Service Worker
   * answers the requests within it.
   *
   * When `@vrowzer/vite-plugin` is used, its `basePath` is injected and this option can be
   * omitted. If both are provided, their canonical values must match. Without the plugin,
   * this option defaults to `'/__preview__/'`.
   */
  basePath?: string
  /**
   * Service Worker version for cache management.
   *
   * When `@vrowzer/vite-plugin` is used, its `serviceWorkerVersion` is injected and this
   * option can be omitted. If both are provided, their values must match. Without the
   * plugin, this option defaults to `'vrowzer-v1'`.
   */
  serviceWorkerVersion?: string
  /**
   * Service Worker registration scope, independent of `basePath`.
   *
   * When `@vrowzer/vite-plugin` is used, its `serviceWorkerScope` is injected and this
   * option can be omitted. If both are provided, their values must match. Without the
   * plugin, this option defaults to `'/'`.
   */
  serviceWorkerScope?: string
  /**
   * Timeout in milliseconds for the Service Worker to become the page controller.
   *
   * This timeout does not apply to Service Worker listen readiness or Web Worker setup.
   *
   * @default 60000
   */
  serviceWorkerReadyTimeout?: number
  /**
   * Timeout in milliseconds for Web Worker setup, measured from Worker creation
   * until `V_WW_SETUP_ACK` is received.
   *
   * This timeout includes loading the Worker transformer and does not apply to
   * Service Worker readiness. Set to `0` for an immediate timeout.
   *
   * @default 90000
   */
  webWorkerSetupTimeout?: number
  /**
   * Timeout in milliseconds for the Web Worker to apply a change made with
   * {@link Vrowzer.addFile}, {@link Vrowzer.updateFile} or {@link Vrowzer.deleteFile}.
   *
   * The Web Worker applies a change after the plugins' `watchChange` hooks finish. This timeout is
   * shorter than the 30 seconds that the Service Worker waits for the Web Worker to answer a
   * request, so with slow plugins or heavy transforms an operation can reject although the change
   * is applied later. Increase it in such environments. Writing the file again resynchronizes it.
   *
   * It also limits how long Vrowzer takes to connect a restarted Service Worker to the Web Worker
   * again. See {@link VrowzerEventMap.serviceWorkerRecoveryError}.
   *
   * @default 10000
   */
  fileSyncTimeout?: number
  /**
   * Timeout in milliseconds for {@link Vrowzer.build}, measured from the creation of the build
   * Worker until the result is received.
   *
   * It includes loading the builder in the build Worker. Set to `0` for an immediate timeout.
   *
   * @default 120000
   */
  buildTimeout?: number
}

/**
 * The library options of {@link VrowzerBuildOptions.build}, a subset of Vite's `build.lib`.
 */
export interface VrowzerBuildLibraryOptions {
  /**
   * The entry of the library, e.g. `/src/index.ts`. Its exports are the API of the library.
   */
  entry: string
  /**
   * The name of the output file. Without it, the `name` of `/package.json` is used, and the
   * build fails when there is none.
   */
  fileName?: string
  /**
   * The name of the CSS file. Defaults to `fileName`.
   */
  cssFileName?: string
  /**
   * The output formats. Only `es` is supported for now.
   *
   * @default ['es']
   */
  formats?: ['es']
}

/**
 * Options for {@link Vrowzer.build}: a subset of the Vite config.
 *
 * They are merged over the Worker config, and sent to the build Worker, so they must be values that
 * `postMessage()` can copy, e.g. no functions.
 */
export interface VrowzerBuildOptions {
  /**
   * The public base path of the outputs (Vite's `base`).
   *
   * @default '/'
   */
  base?: string
  /**
   * The mode (Vite's `mode`), which `import.meta.env.MODE` returns.
   *
   * @default 'production'
   */
  mode?: string
  /**
   * Global constants to replace (Vite's `define`), merged over the `define` of the Worker config.
   */
  define?: Record<string, unknown>
  /**
   * Build options: a subset of Vite's `build`.
   */
  build?: {
    /**
     * Builds a library. Required for now, because HTML app builds are not supported yet.
     */
    lib?: VrowzerBuildLibraryOptions | false
    /**
     * Minifies the JavaScript with Oxc. The CSS is not minified.
     *
     * @default true
     */
    minify?: boolean
    /**
     * Generates source maps of the JavaScript.
     *
     * @default false
     */
    sourcemap?: boolean | 'inline' | 'hidden'
    /**
     * The directory of the assets, relative to the output root.
     *
     * @default 'assets'
     */
    assetsDir?: string
    /**
     * Assets smaller than this many bytes are inlined as data URLs.
     *
     * @default 4096
     */
    assetsInlineLimit?: number
    /**
     * Splits the CSS of async chunks into their own files. Without it, the CSS goes into one file.
     *
     * @default false for a library, true otherwise
     */
    cssCodeSplit?: boolean
    /**
     * The compatibility target of the JavaScript, e.g. `'es2022'`.
     *
     * @default 'baseline-widely-available'
     */
    target?: string | string[]
    /**
     * The module preload of the outputs.
     */
    modulePreload?: boolean | { polyfill?: boolean }
    /**
     * Options for rolldown.
     */
    rolldownOptions?: {
      /**
       * The entry of the build, e.g. an HTML file.
       */
      input?: string
      /**
       * Modules to keep as imports instead of bundling them.
       */
      external?: (string | RegExp)[]
      output?: {
        /**
         * Set to `false` to put all the code into one file, including dynamically imported modules.
         */
        codeSplitting?: boolean
      }
    }
  }
  /**
   * Cancels the build. The build Worker is terminated, and the promise rejects with the reason.
   */
  signal?: AbortSignal
}

/**
 * A log of {@link Vrowzer.build}: an error or a warning.
 */
export interface VrowzerBuildLog {
  /**
   * The message, without colors.
   */
  message: string
  /**
   * The code of the log, e.g. `PARSE_ERROR` from rolldown, or `VROWZER_UNSUPPORTED_OPTION` for an
   * option that the browser build does not support.
   */
  code?: string
  /**
   * The plugin that reported it.
   */
  plugin?: string
  /**
   * The module that it is about.
   */
  id?: string
  /**
   * The location in the module. The column starts at 0.
   */
  loc?: { line: number; column: number; file?: string }
  /**
   * The code around the location.
   */
  frame?: string
}

/**
 * The result of {@link Vrowzer.build}.
 */
export interface VrowzerBuildResult {
  /**
   * The outputs, keyed by the path from the output root, e.g. `my-lib.js`.
   *
   * JavaScript, CSS, source maps and text assets are strings. Binary assets are ArrayBuffers.
   */
  files: Record<string, string | ArrayBuffer>
  /**
   * The warnings of the build.
   */
  warnings: VrowzerBuildLog[]
}

function summarizeBuildErrors(errors: readonly VrowzerBuildLog[]): string {
  const first = errors[0]?.message.split('\n')[0]?.trim() || 'unknown error'
  const more = errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''
  return `[Vrowzer] build() failed: ${first}${more}`
}

/**
 * The error of a {@link Vrowzer.build} that failed: an error in the project, or an option that the
 * browser build does not support.
 */
export class VrowzerBuildError extends Error {
  /**
   * The errors of the build. The message summarizes the first one.
   */
  readonly errors: readonly VrowzerBuildLog[]

  /**
   * @param errors - The errors of the build.
   * @param options - The options of `Error`, e.g. `cause`.
   */
  constructor(errors: readonly VrowzerBuildLog[], options?: ErrorOptions) {
    super(summarizeBuildErrors(errors), options)
    this.name = 'VrowzerBuildError'
    this.errors = errors
  }
}

/**
 * VrowzerConfig defines the configuration options for {@linkcode Vrowzer.ready}
 */
export interface VrowzerConfig {
  /**
   * A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer.
   * An ArrayBuffer is copied for the Web Worker when {@linkcode Vrowzer.ready} is called, and stays usable.
   * Without `/index.html`, a default one is used: an empty `#app` element and a module script that
   * loads `/main.js`.
   */
  files: Record<string, string | ArrayBuffer>
}

/**
 * Options for mounting a preview session.
 */
export interface PreviewMountOptions {
  /**
   * Host-defined identity for the preview pane.
   */
  id: string
  /**
   * Values exposed to the preview document before its scripts run.
   */
  params?: Record<string, string>
}

/**
 * Context exposed to the mounted preview document.
 */
export interface PreviewContext {
  /**
   * Host-defined preview session identity.
   */
  readonly id: string
  /**
   * Optional values provided when the preview session was mounted.
   */
  readonly params?: Readonly<Record<string, string>>
}

/**
 * A mounted preview iframe managed by a {@link Vrowzer} instance.
 */
export interface PreviewSession {
  /**
   * Host-defined preview session identity.
   */
  readonly id: string
  /**
   * Iframe used by this preview session.
   */
  readonly iframe: HTMLIFrameElement
  /**
   * Container that owns the iframe.
   */
  readonly container: HTMLElement
  /**
   * Reloads only this preview document.
   */
  reload(): void
  /**
   * Removes only this preview document.
   */
  unmount(): void
}

/**
 * A preview session target accepted by lifecycle methods.
 */
export type PreviewSessionRef = string | PreviewSession

/**
 * Information about a preview document that failed to load before its application code started.
 */
export interface PreviewLoadErrorInfo {
  /**
   * Host-defined identity of the preview session that failed to load.
   */
  readonly id: string
  /**
   * Where loading failed: fetching the preview HTML, or loading one of its initial scripts.
   */
  readonly stage: 'html' | 'script'
  /**
   * Human-readable summary of the failure. It is present even when the browser reports no details.
   */
  readonly message: string
  /**
   * Requested URL, when known. Inline module scripts have no URL.
   */
  readonly url?: string
  /**
   * HTTP status, when a response was received.
   */
  readonly status?: number
  /**
   * The original exception, when one was thrown.
   */
  readonly error?: {
    readonly name: string
    readonly message: string
  }
}

declare global {
  interface Window {
    /**
     * Context for the current Vrowzer preview document.
     */
    __VROWZER_PREVIEW__?: Readonly<PreviewContext>
  }
}

/**
 * Event map for {@link Vrowzer}.
 *
 * Forwards all {@link SvcWorkerControllerEventMap} events from the underlying Service Worker controller,
 * and adds events for preview sessions and for reconnecting a restarted Service Worker.
 */
export type VrowzerEventMap = SvcWorkerControllerEventMap & {
  /**
   * Emitted when a preview document fails to load before its application code starts:
   * the preview HTML cannot be fetched or returns an error status, or one of its initial scripts fails to load.
   *
   * Runtime errors thrown by the application are not reported by this event.
   *
   * Payload is {@link PreviewLoadErrorInfo}
   */
  previewLoadError: PreviewLoadErrorInfo
  /**
   * Emitted when Vrowzer has connected a restarted Service Worker to the Web Worker again.
   *
   * The browser stops an idle Service Worker and starts it again for the next request or message.
   * The restarted Service Worker has lost its channel to the Web Worker, which keeps the project
   * files, so Vrowzer connects the channel again, without reloading the host page. File operations
   * go on in the meantime.
   */
  serviceWorkerRecovered: void
  /**
   * Emitted when Vrowzer could not connect a restarted Service Worker to the Web Worker again within
   * {@link VrowzerOptions.fileSyncTimeout}.
   *
   * Preview requests that the Service Worker cannot forward yet wait for up to 10 seconds, and then
   * get a 503 response. Vrowzer tries again when the Service Worker restarts the next time. To start
   * over, dispose the instance and create a new one.
   *
   * Payload is the `Error` that describes the failure.
   */
  serviceWorkerRecoveryError: Error
}

/**
 * The main interface for the Vrowzer preview environment.
 */
export interface Vrowzer extends Emittable<VrowzerEventMap> {
  /**
   * The base path of the previews of this instance: {@link VrowzerOptions.basePath} followed by an
   * ID of the instance, e.g. `/__preview__/0123456789ab/`.
   *
   * The previews load from it, and it is the Vite `base` of the project, which
   * `import.meta.env.BASE_URL` returns in the preview. The Service Worker forwards the requests
   * under it to the Web Worker of this instance, so several instances can share one Service Worker,
   * e.g. in two tabs.
   *
   * It is set when {@link Vrowzer} is called, and stays the same after {@link Vrowzer.dispose}.
   */
  readonly previewBasePath: string
  /**
   * Ready for preview system initialization.
   *
   * This method initializes the Web Worker with the initial files, the Service Worker, and the
   * MessageChannel between them.
   * It can only be called once per Vrowzer instance.
   *
   * @return A promise that resolves to `true` if the boot process is successful, or `false` if it fails.
   */
  ready(config: VrowzerConfig): Promise<boolean>
  /**
   * Mounts the preview system to a specified container element in the DOM.
   *
   * Creates a credentialless iframe with srcdoc bootstrap that fetches
   * the preview HTML via the Service Worker.
   *
   * Reusing an existing session ID returns the original session without reloading or moving it.
   * The container and params from the first mount remain in effect.
   *
   * @param container - A DOM element where the preview iframe will be mounted.
   * @param options - Preview identity and context values.
   * @returns The mounted preview session.
   */
  mount(container: HTMLElement, options: PreviewMountOptions): PreviewSession
  /**
   * Returns the currently mounted preview session for an ID.
   *
   * @param id - Host-defined preview session identity.
   */
  getSession(id: string): PreviewSession | undefined
  /**
   * Returns a snapshot of all currently mounted preview sessions.
   */
  sessions(): readonly PreviewSession[]
  /**
   * Reloads one preview session, or every session when no target is provided.
   *
   * @param target - A session ID or mounted session object.
   */
  reloadPreview(target?: PreviewSessionRef): void
  /**
   * Unmounts one preview session, or every session when no target is provided.
   * The Service Worker, the Web Worker, and its virtual filesystem remain active.
   * Use {@link Vrowzer.dispose} to release the whole instance.
   *
   * @param target - A session ID or mounted session object.
   */
  unmount(target?: PreviewSessionRef): void
  /**
   * Adds a new file to the preview environment with the specified content.
   *
   * The promise resolves when later preview requests see the change: the Web Worker has written the
   * file to its virtual filesystem, and invalidated the modules that depend on it. HMR updates of
   * mounted previews are not awaited.
   *
   * It rejects without sending the change before {@link Vrowzer.ready} resolves to `true`, after it
   * fails, and after {@link Vrowzer.dispose}. It also rejects when the Web Worker fails to apply the
   * change, when it reports an error, when it does not reply within
   * {@link VrowzerOptions.fileSyncTimeout}, or when the instance is disposed first. The change may
   * be partly applied then; write the file again to resynchronize.
   *
   * @param filePath - The path of the file to be added.
   * @param content - The content of the file, which can be a string or an ArrayBuffer. An
   * ArrayBuffer is copied for the Web Worker and stays usable.
   */
  addFile(filePath: string, content: string | ArrayBuffer): Promise<void>
  /**
   * Updates the content of a specific file in the preview environment.
   *
   * The promise resolves and rejects as with {@link Vrowzer.addFile}.
   *
   * @param filePath - The path of the file to be updated.
   * @param content - The new content for the file, which can be a string or an ArrayBuffer. An
   * ArrayBuffer is copied for the Web Worker and stays usable.
   */
  updateFile(filePath: string, content: string | ArrayBuffer): Promise<void>
  /**
   * Deletes a specific file from the preview environment.
   *
   * The promise resolves when later preview requests no longer see the file, and rejects as with
   * {@link Vrowzer.addFile}. Deleting a file that does not exist resolves as well.
   *
   * @param filePath - The path of the file to be deleted.
   */
  deleteFile(filePath: string): Promise<void>
  /**
   * Builds the project for production in a build Worker, e.g. as a library.
   *
   * The build uses the project files as they are when this method is called: the files of
   * {@link Vrowzer.ready}, with the default `/index.html` when they have none, and the changes of
   * the file methods called before. Changes made later are not included, even before the build
   * ends.
   *
   * Each build runs in a new build Worker, with the Worker config bundled for production, and the
   * build Worker is terminated when the build ends. The previews are not affected. Only library
   * builds (`build.lib`) in the `es` format are supported for now, and one build at a time.
   *
   * A closed build Worker takes about 2 seconds to stop in Chromium. When 4 of them closed within
   * the last 2.5 seconds, e.g. after short builds one after another, a build waits before it
   * creates its build Worker. The wait does not count toward {@link VrowzerOptions.buildTimeout}.
   *
   * It needs the `build` option of `@vrowzer/vite-plugin`.
   *
   * @param options - The options of the build, merged over the Worker config.
   * @returns The outputs and the warnings.
   * @throws Rejects before {@link Vrowzer.ready} resolves to `true`, after {@link Vrowzer.dispose},
   * when the `build` option of the plugin is not enabled, and while another build is running.
   * Rejects with a {@link VrowzerBuildError} when the build fails, e.g. with an error in the
   * project or an unsupported option. Rejects with an `Error` when the build does not finish within
   * {@link VrowzerOptions.buildTimeout}, when the build Worker fails, or when {@link Vrowzer.dispose}
   * is called first, and with the reason of `signal` when it is aborted.
   */
  build(options?: VrowzerBuildOptions): Promise<VrowzerBuildResult>
  /**
   * Disposes this instance.
   *
   * An in-progress {@link Vrowzer.ready} is aborted and resolves to `false`, and the reconnection of
   * a restarted Service Worker is stopped. Every preview session is unmounted, the Web Worker is
   * terminated with the project files, Service Worker controller events are no longer forwarded, and
   * all event handlers are removed right away. The Service Worker registration is kept for other
   * clients, and answers the requests under {@link Vrowzer.previewBasePath} with 404 from then on.
   *
   * File operations still waiting for the Web Worker reject, and a running {@link Vrowzer.build}
   * rejects with its build Worker terminated. After disposal, `ready()`, the file methods and
   * `build()` reject, `mount()` throws, and `unmount()` and `reloadPreview()` do nothing. Create a
   * new instance to start again.
   *
   * @returns A promise that resolves when every resource is released. Calling this method again
   * returns the same promise. It rejects with an `AggregateError` when some resources could not
   * be released; the remaining resources are still released.
   */
  dispose(): Promise<void>
  /**
   * Same as {@link Vrowzer.dispose}, for `await using`.
   */
  [Symbol.asyncDispose](): Promise<void>
}

interface ResolvedVrowzerOptions {
  basePath: string
  serviceWorkerVersion: string
  serviceWorkerScope: string
  serviceWorkerReadyTimeout: number
  webWorkerSetupTimeout: number
  fileSyncTimeout: number
  buildTimeout: number
}

/**
 * A file operation waiting for the Web Worker to acknowledge it.
 */
interface PendingFileOperation {
  operation: FileOperation
  path: string
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface PreviewSessionRecord {
  context: Readonly<PreviewContext>
  session: PreviewSession
  /**
   * Identifies the current bootstrap document, so that reports from replaced documents are ignored.
   */
  loadToken: string
}

function resolveVrowzerOptions(options: VrowzerOptions): ResolvedVrowzerOptions {
  return {
    basePath: resolvePreviewBasePath(options.basePath),
    serviceWorkerVersion: resolveServiceWorkerVersion(options.serviceWorkerVersion),
    serviceWorkerScope: resolveServiceWorkerScope(options.serviceWorkerScope),
    serviceWorkerReadyTimeout:
      options.serviceWorkerReadyTimeout ?? DEFAULT_SERVICE_WORKER_READY_TIMEOUT,
    webWorkerSetupTimeout: options.webWorkerSetupTimeout ?? DEFAULT_WEB_WORKER_SETUP_TIMEOUT,
    fileSyncTimeout: options.fileSyncTimeout ?? DEFAULT_FILE_SYNC_TIMEOUT,
    buildTimeout: options.buildTimeout ?? DEFAULT_BUILD_TIMEOUT
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    return abortable(promise, signal)
  }

  return new Promise<T>((resolve, reject) => {
    const settle = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      settle()
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      settle()
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => {
        settle()
        resolve(value)
      },
      (error: unknown) => {
        settle()
        reject(error)
      }
    )
  })
}

/**
 * Resolves after `ms` milliseconds, or rejects with the reason of `signal` when it is aborted first.
 */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function serializeInlineScriptValue(value: unknown): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new TypeError('Preview bootstrap value is not serializable')
  }
  return serialized
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function describeFileOperation(operation: FileOperation, path: string): string {
  return `[Vrowzer] ${operation}(${JSON.stringify(path)})`
}

/**
 * Creates the ID of a runtime instance, which names its previews: 12 hexadecimal digits from 48
 * random bits.
 */
function createRuntimeId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Copies the files given to `ready()`, so that later changes by the caller do not reach the
 * Web Worker. ArrayBuffers are copied as well, and the caller's buffers are never transferred.
 */
function copyInitialFiles(files: VrowzerConfig['files']): Record<string, string | ArrayBuffer> {
  const copied: Record<string, string | ArrayBuffer> = { ...files }
  for (const [path, content] of Object.entries(copied)) {
    if (typeof content !== 'string') {
      copied[path] = content.slice(0)
    }
  }
  return copied
}

/**
 * Rebuilds the error that a Worker reported in a `V_FS_ACK` message.
 */
function toWorkerError(error: unknown): Error {
  const workerError = new Error(
    isRecord(error) && typeof error.message === 'string' ? error.message : 'unknown error'
  )
  workerError.name = isRecord(error) && typeof error.name === 'string' ? error.name : 'Error'
  return workerError
}

/**
 * Runs a cleanup step and collects its error, so that the remaining steps still run.
 */
function attempt(errors: unknown[], step: () => void): void {
  try {
    step()
  } catch (error) {
    errors.push(error)
  }
}

/**
 * Builds the event payload from a bootstrap report, keeping only known and bounded fields.
 * The session id comes from the host's record, never from the report.
 */
function toPreviewLoadErrorInfo(
  id: string,
  report: Record<string, unknown>
): PreviewLoadErrorInfo | undefined {
  const { stage, message, url, status, error } = report
  if (stage !== 'html' && stage !== 'script') {
    return undefined
  }

  const fallbackMessage =
    stage === 'html' ? 'Failed to load the preview HTML' : 'Failed to load a preview script'
  const safeMessage =
    typeof message === 'string' && message.length > 0
      ? truncate(message, PREVIEW_LOAD_ERROR_MESSAGE_MAX_LENGTH)
      : fallbackMessage
  // A `blob:` URL of an inline module script means nothing to the host
  const safeUrl =
    typeof url === 'string' && url.length > 0 && !url.startsWith('blob:')
      ? truncate(url, PREVIEW_LOAD_ERROR_URL_MAX_LENGTH)
      : undefined
  const safeStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined
  const safeError =
    isRecord(error) && typeof error.name === 'string' && typeof error.message === 'string'
      ? Object.freeze({
          name: truncate(error.name, PREVIEW_LOAD_ERROR_NAME_MAX_LENGTH),
          message: truncate(error.message, PREVIEW_LOAD_ERROR_MESSAGE_MAX_LENGTH)
        })
      : undefined

  return Object.freeze({
    id,
    stage,
    message: safeMessage,
    ...(safeUrl === undefined ? {} : { url: safeUrl }),
    ...(safeStatus === undefined ? {} : { status: safeStatus }),
    ...(safeError === undefined ? {} : { error: safeError })
  })
}

/**
 * Factory function to create a {@link Vrowzer} instance.
 * @param options - Configuration options for the Vrowzer instance.
 * @returns A read-only Vrowzer instance.
 */
export function Vrowzer(options: VrowzerOptions = {}): Readonly<Vrowzer> {
  const resolved = resolveVrowzerOptions(options)

  const _emitter = Emitter<VrowzerEventMap>()
  const publisher: FileSystemPublisher = createFileSystemPublisher()
  const previewSessions = new Map<string, PreviewSessionRecord>()
  let webWorker: Worker | null = null
  let readyState: ReadyState = 'idle'
  let listeningPreviewMessages = false
  let disposePromise: Promise<void> | null = null
  let readyAbortController: AbortController | null = null
  let readyPromise: Promise<boolean> | null = null
  // Release failures of an aborted ready(), reported by dispose()
  const readyReleaseErrors: unknown[] = []
  const controllerSubscriptions: (() => void)[] = []
  // File operations waiting for the Web Worker to acknowledge them, by operation id
  const pendingFileOperations = new Map<string, PendingFileOperation>()
  // The owner of the previews and the Web Worker channel of this instance. The previews load from
  // its own base path, so that several instances can share one Service Worker.
  const runtimeId = createRuntimeId()
  const previewBasePath = `${resolved.basePath}${runtimeId}/`
  // Whether the Web Worker channel was sent to the Service Worker, which then forwards the previews
  let channelRequested = false
  // The Service Worker instance that has the Web Worker channel of this instance
  let serviceWorkerInstanceId: string | null = null
  // A Service Worker instance that started while ready() was in progress
  let instanceStartedDuringInit: string | null = null
  let stopListeningServiceWorkerStarts: (() => void) | null = null
  // The recovery of a restarted Service Worker in progress
  let recovery: AbortController | null = null
  // The project files as the caller gave them, for build(). The Web Worker has its own copy.
  const projectFiles = new Map<string, string | ArrayBuffer>()
  // The running build, which dispose() cancels
  let runningBuild: { cancel: (error: Error) => void } | null = null
  // Identifies the builds, so that the results of other builds are ignored
  let buildSequence = 0
  // When the recent build Workers were closed, oldest first
  const closedBuildWorkers: number[] = []

  /**
   * How long to wait before creating a build Worker, so that at most
   * {@link MAX_STOPPING_BUILD_WORKERS} closed ones are stopping when it starts.
   */
  function buildWorkerDelay(): number {
    const now = Date.now()
    while (
      closedBuildWorkers.length > 0 &&
      now - closedBuildWorkers[0]! >= BUILD_WORKER_STOP_TIME
    ) {
      closedBuildWorkers.shift()
    }
    if (closedBuildWorkers.length < MAX_STOPPING_BUILD_WORKERS) {
      return 0
    }
    const closedAt = closedBuildWorkers[closedBuildWorkers.length - MAX_STOPPING_BUILD_WORKERS]!
    return closedAt + BUILD_WORKER_STOP_TIME - now
  }

  /**
   * Runs a build: waits until a build Worker can start when the recent builds were short, then
   * runs the build in a new build Worker.
   */
  async function runBuild(
    files: Record<string, string | ArrayBuffer>,
    options: Omit<VrowzerBuildOptions, 'signal'>,
    signal: AbortSignal | undefined
  ): Promise<VrowzerBuildResult> {
    // dispose() aborts it
    const cancellation = new AbortController()
    const build = { cancel: (error: Error) => cancellation.abort(error) }
    runningBuild = build
    try {
      const delay = buildWorkerDelay()
      if (delay > 0) {
        await wait(
          delay,
          signal ? AbortSignal.any([cancellation.signal, signal]) : cancellation.signal
        )
      }
      cancellation.signal.throwIfAborted()
      signal?.throwIfAborted()
      return await runBuildWorker(files, options, signal, cancellation.signal)
    } finally {
      if (runningBuild === build) {
        runningBuild = null
      }
    }
  }

  /**
   * Runs a build in a new build Worker, and terminates the Worker when the build ends.
   */
  function runBuildWorker(
    files: Record<string, string | ArrayBuffer>,
    options: Omit<VrowzerBuildOptions, 'signal'>,
    signal: AbortSignal | undefined,
    cancellation: AbortSignal
  ): Promise<VrowzerBuildResult> {
    const id = ++buildSequence
    const worker = new Worker(new URL('./build-worker.ts', import.meta.url), { type: 'module' })
    const close = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.onmessageerror = null
      worker.terminate()
      closedBuildWorkers.push(Date.now())
    }

    const result = new Promise<VrowzerBuildResult>((resolve, reject) => {
      cancellation.addEventListener('abort', () => reject(cancellation.reason), { once: true })
      worker.onerror = event => {
        reject(new Error(`[Vrowzer] The build Worker failed: ${event.message || 'unknown error'}`))
      }
      worker.onmessageerror = () => {
        reject(new Error('[Vrowzer] The build Worker sent a message that could not be read'))
      }
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data
        if (!isRecord(data)) {
          return
        }
        if (data.type === V_BW_READY) {
          if (typeof data.error === 'string') {
            reject(
              new Error(`[Vrowzer] The build Worker could not load the builder: ${data.error}`)
            )
            return
          }
          try {
            worker.postMessage({
              type: V_BW_BUILD,
              id,
              files,
              options
            } satisfies BuildWorkerBuildMessage)
          } catch (error) {
            reject(
              new Error(
                `[Vrowzer] build() could not send the options to the build Worker: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error }
              )
            )
          }
          return
        }
        if (data.type !== V_BW_RESULT || data.id !== id) {
          return
        }
        const message = data as BuildWorkerResultMessage
        if (message.ok) {
          resolve({ files: message.files, warnings: message.warnings })
        } else {
          reject(new VrowzerBuildError(message.errors))
        }
      }
    })

    return withTimeout(result, resolved.buildTimeout, '[Vrowzer] build()', signal).finally(close)
  }

  function cleanupWebWorker(): void {
    const worker = webWorker
    if (!worker) {
      return
    }

    // Forget the Worker first, so that a failing terminate() is not retried
    webWorker = null
    publisher.removeTarget(worker)
    worker.onmessage = null
    worker.onerror = null
    worker.terminate()
  }

  /**
   * Releases what initialization created: Service Worker controller event forwarding, the
   * listener of the Service Worker instances that start, and the Web Worker with its file sync.
   * Used by a failed ready() and by dispose().
   */
  function releaseRuntime(errors: unknown[]): void {
    for (const stop of controllerSubscriptions.splice(0)) {
      attempt(errors, stop)
    }
    const stopListeningStarts = stopListeningServiceWorkerStarts
    stopListeningServiceWorkerStarts = null
    if (stopListeningStarts) {
      attempt(errors, stopListeningStarts)
    }
    attempt(errors, cleanupWebWorker)
  }

  function assertNotDisposed(method: string): void {
    if (readyState === 'disposed') {
      throw new Error(`[Vrowzer] ${method}() cannot be called after dispose()`)
    }
  }

  function settleFileOperation(id: string, error?: Error): void {
    const pending = pendingFileOperations.get(id)
    if (!pending) {
      return
    }
    pendingFileOperations.delete(id)
    clearTimeout(pending.timer)
    if (error) {
      pending.reject(error)
    } else {
      pending.resolve()
    }
  }

  function rejectFileOperations(toError: (pending: PendingFileOperation) => Error): void {
    // Deleting entries while iterating a Map is safe, so no copy is needed
    for (const [id, pending] of pendingFileOperations) {
      settleFileOperation(id, toError(pending))
    }
  }

  function handleFileSyncAck(data: unknown): void {
    if (!isRecord(data) || data.type !== V_FS_ACK || typeof data.id !== 'string') {
      return
    }
    const pending = pendingFileOperations.get(data.id)
    // Unknown ids belong to settled operations
    if (!pending) {
      return
    }
    if (data.error !== undefined) {
      const cause = toWorkerError(data.error)
      settleFileOperation(
        data.id,
        new Error(
          `${describeFileOperation(pending.operation, pending.path)} failed in the Web Worker: ${cause.message}`,
          { cause }
        )
      )
      return
    }
    settleFileOperation(data.id)
  }

  /**
   * Receives file sync acknowledgements from the Web Worker, once the instance is ready.
   */
  function listenFileSyncAcks(worker: Worker): void {
    worker.onmessage = event => handleFileSyncAck(event.data)
    worker.onerror = event => {
      console.error('[Vrowzer] Web Worker error:', event.message, event.filename, event.lineno)
      const message = event.message || 'unknown error'
      rejectFileOperations(
        pending =>
          new Error(
            `${describeFileOperation(pending.operation, pending.path)} failed because the Web Worker reported an error: ${message}`
          )
      )
    }
  }

  /**
   * Sends a file operation to the Web Worker, which has the project files, and waits until it has
   * applied it, up to `fileSyncTimeout`.
   */
  function syncFile(
    operation: FileOperation,
    path: string,
    send: (options: { id: string }) => void
  ): Promise<void> {
    if (readyState === 'disposed') {
      return Promise.reject(new Error(`[Vrowzer] ${operation}() cannot be called after dispose()`))
    }
    if (readyState !== 'ready') {
      return Promise.reject(
        new Error(
          `[Vrowzer] ${operation}() can only be called after ready() resolves to true (current state: ${readyState})`
        )
      )
    }

    const id = crypto.randomUUID()
    const timeout = resolved.fileSyncTimeout

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        settleFileOperation(
          id,
          new Error(
            `${describeFileOperation(operation, path)} timed out after ${timeout}ms waiting for the Web Worker`
          )
        )
      }, timeout)
      pendingFileOperations.set(id, { operation, path, resolve, reject, timer })

      try {
        send({ id })
      } catch (error) {
        settleFileOperation(
          id,
          new Error(
            `${describeFileOperation(operation, path)} could not be sent: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
          )
        )
      }
    })
  }

  /**
   * Listens for the Service Worker instances that start, to connect the Web Worker channel again
   * in a restarted one.
   */
  function listenServiceWorkerStarts(): void {
    const container = getController()?.container
    if (!container) {
      return
    }
    const handler = (event: MessageEvent) => {
      const data: unknown = event.data
      if (
        isRecord(data) &&
        data.type === V_SW_INSTANCE_STARTED &&
        typeof data.instanceId === 'string'
      ) {
        handleServiceWorkerStarted(data.instanceId)
      }
    }
    container.addEventListener('message', handler)
    stopListeningServiceWorkerStarts = () => container.removeEventListener('message', handler)
  }

  function handleServiceWorkerStarted(instanceId: string): void {
    if (readyState === 'initializing') {
      // initialize() restores the project once ready() completes
      instanceStartedDuringInit = instanceId
      return
    }
    if (readyState === 'ready' && instanceId !== serviceWorkerInstanceId) {
      recoverServiceWorker(instanceId)
    }
  }

  /**
   * Connects the Web Worker channel again in a restarted Service Worker, which has lost it. The Web
   * Worker still has the project files, so file operations go on during the recovery. A recovery
   * that does not finish within `fileSyncTimeout` fails, and is tried again when the Service Worker
   * restarts the next time.
   */
  function recoverServiceWorker(instanceId: string): void {
    serviceWorkerInstanceId = instanceId
    // A newer Service Worker instance started, so stop connecting the previous one
    recovery?.abort(new Error('[Vrowzer] A newer Service Worker instance started'))
    const controller = new AbortController()
    recovery = controller
    const timeout = resolved.fileSyncTimeout
    const timer = setTimeout(() => {
      controller.abort(new Error(`timed out after ${timeout}ms`))
    }, timeout)

    void restoreServiceWorker(controller.signal)
      .then(
        () => {
          if (recovery !== controller) {
            return
          }
          recovery = null
          _emitter.emit('serviceWorkerRecovered', undefined)
        },
        (error: unknown) => {
          // A newer instance or dispose() stopped this recovery
          if (recovery !== controller) {
            return
          }
          recovery = null
          const reason = error instanceof Error ? error.message : String(error)
          _emitter.emit(
            'serviceWorkerRecoveryError',
            new Error(
              `[Vrowzer] Could not connect the restarted Service Worker to the Web Worker: ${reason}`,
              { cause: error }
            )
          )
        }
      )
      .finally(() => clearTimeout(timer))
  }

  /**
   * Connects the Web Worker channel again in the restarted Service Worker.
   */
  async function restoreServiceWorker(signal: AbortSignal): Promise<void> {
    if (!getServiceWorker()) {
      throw new Error('the Service Worker is not available')
    }
    await establishChannel(signal)
    // The recovery may have been stopped while the last acknowledgement was being delivered
    signal.throwIfAborted()
  }

  /**
   * Stops the recovery in progress without reporting it.
   */
  function stopRecovery(reason: Error): void {
    const current = recovery
    recovery = null
    current?.abort(reason)
  }

  /**
   * Establish MessageChannel between Service Worker and Web Worker.
   * Creates a MessageChannel, sends one port to each side,
   * and waits for both ACKs (handshake + birpc ready).
   */
  async function establishChannel(signal: AbortSignal): Promise<void> {
    const serviceWorker = getServiceWorker()
    const worker = webWorker
    if (!serviceWorker || !worker) {
      return
    }

    const channel = new MessageChannel()
    const controller = getController()
    let stopWaitingForServiceWorker = () => {}
    let stopWaitingForWebWorker = () => {}

    // Wait for Service Worker's ACK. Instances in the same page receive each other's ACKs, so take
    // only the one of this instance.
    const serviceWorkerAck = new Promise<void>(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === V_WW_CONNECT_PORT_ACK && event.data.runtimeId === runtimeId) {
          stopWaitingForServiceWorker()
          resolve()
        }
      }
      controller?.container.addEventListener('message', handler)
      stopWaitingForServiceWorker = () => {
        controller?.container.removeEventListener('message', handler)
      }
    })

    // Wait for Web Worker's ACK
    const webWorkerAck = new Promise<void>(resolve => {
      const prevHandler = worker.onmessage
      const handler = (event: MessageEvent) => {
        if (event.data.type === V_SW_CONNECT_PORT_ACK) {
          stopWaitingForWebWorker()
          resolve()
          return
        }
        prevHandler?.call(worker, event)
      }
      worker.onmessage = handler
      stopWaitingForWebWorker = () => {
        if (worker.onmessage === handler) {
          worker.onmessage = prevHandler
        }
      }
    })

    // Transfer ports
    channelRequested = true
    serviceWorker.postMessage({ type: V_WW_CONNECT_PORT, runtimeId }, [channel.port1])
    worker.postMessage({ type: V_SW_CONNECT_PORT }, [channel.port2])

    try {
      // Wait for both sides to complete handshake + birpc setup
      await withTimeout(
        Promise.all([serviceWorkerAck, webWorkerAck]),
        15000,
        'MessageChannel handshake',
        signal
      )
    } finally {
      // Stop waiting for the ACKs after a timeout or an abort as well
      stopWaitingForServiceWorker()
      stopWaitingForWebWorker()
    }
  }

  function handlePreviewMessage(event: MessageEvent): void {
    const report: unknown = event.data
    if (
      !isRecord(report) ||
      report.type !== PREVIEW_LOAD_ERROR_MESSAGE_TYPE ||
      typeof report.token !== 'string' ||
      event.origin !== window.location.origin
    ) {
      return
    }

    for (const record of previewSessions.values()) {
      if (record.loadToken !== report.token) {
        continue
      }
      // The token alone is not enough: the report must come from this session's iframe
      if (event.source === record.session.iframe.contentWindow) {
        const info = toPreviewLoadErrorInfo(record.session.id, report)
        if (info) {
          _emitter.emit('previewLoadError', info)
        }
      }
      return
    }
  }

  function listenPreviewMessages(): void {
    if (listeningPreviewMessages) {
      return
    }
    window.addEventListener('message', handlePreviewMessage)
    listeningPreviewMessages = true
  }

  function stopListeningPreviewMessagesIfIdle(): void {
    if (!listeningPreviewMessages || previewSessions.size > 0) {
      return
    }
    window.removeEventListener('message', handlePreviewMessage)
    listeningPreviewMessages = false
  }

  function createBootstrapHtml(
    previewUrl: string,
    context: Readonly<PreviewContext>,
    loadToken: string
  ): string {
    const serializedPreviewUrl = serializeInlineScriptValue(previewUrl)
    const serializedContext = serializeInlineScriptValue(context)
    const serializedLoadToken = serializeInlineScriptValue(loadToken)
    const serializedHostOrigin = serializeInlineScriptValue(window.location.origin)
    const serializedMessageType = serializeInlineScriptValue(PREVIEW_LOAD_ERROR_MESSAGE_TYPE)

    // Fetch preview HTML via SW, then inject DOM and execute scripts manually.
    // We avoid document.write() (deprecated) because it doesn't guarantee
    // ESM module execution order in about:srcdoc iframes.
    return `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
(() => {
  const previewUrl = ${serializedPreviewUrl};
  // The host accepts a report only from this session's iframe with the current token
  const token = ${serializedLoadToken};
  const hostOrigin = ${serializedHostOrigin};

  function report(stage, detail) {
    try {
      parent.postMessage(
        Object.assign({ type: ${serializedMessageType}, token: token, stage: stage }, detail),
        hostOrigin
      );
    } catch (e) {}
  }

  function toErrorInfo(e) {
    return e instanceof Error
      ? { name: e.name, message: e.message }
      : { name: 'Error', message: String(e) };
  }

  function resolveUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch (e) {
      return url;
    }
  }

  (async () => {
    try {
      const res = await fetch(previewUrl);
      if (!res.ok) {
        // Keep rendering the response body, as a browser does for an error page
        report('html', {
          message: 'Failed to load the preview HTML: ' + res.status + (res.statusText ? ' ' + res.statusText : ''),
          url: res.url || resolveUrl(previewUrl),
          status: res.status
        });
      }
      const html = await res.text();
      const origin = new URL(res.url).origin;
      const parsed = new DOMParser().parseFromString(html, 'text/html');

      // Copy non-script nodes
      for (const n of [...parsed.head.childNodes])
        if (n.nodeName !== 'SCRIPT') document.head.appendChild(document.importNode(n, true));
      document.body.innerHTML = '';
      for (const n of [...parsed.body.childNodes])
        if (n.nodeName !== 'SCRIPT') document.body.appendChild(document.importNode(n, true));

      // Expose the pane context before any preview script runs.
      const previewContext = ${serializedContext};
      if (previewContext.params) Object.freeze(previewContext.params);
      Object.freeze(previewContext);
      document.documentElement.dataset.vrowzerPreviewId = previewContext.id;
      window.__VROWZER_PREVIEW__ = previewContext;

      // Pre-setup React DevTools hook so hook.inject() populates renderers Map
      // before React Refresh's injectIntoGlobalHook() wraps it.
      if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        var __id = 0;
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          renderers: new Map(), supportsFiber: true,
          inject: function(i) { var id = __id++; this.renderers.set(id, i); return id; },
          onScheduleFiberRoot: function() {},
          onCommitFiberRoot: function() {},
          onCommitFiberUnmount: function() {},
        };
      }

      // Execute scripts sequentially (module scripts awaited via onload).
      for (const orig of parsed.querySelectorAll('script')) {
        await execScript(orig, origin).catch(function() {});
      }
    } catch (e) {
      const error = toErrorInfo(e);
      report('html', {
        message: 'Failed to load the preview HTML: ' + error.message,
        url: resolveUrl(previewUrl),
        error: error
      });
      document.body.textContent = 'Preview load error: ' + error.message;
    }
  })();

  function execScript(orig, origin) {
    return new Promise(function(resolve) {
      var s = document.createElement('script');
      for (var a of orig.attributes) s.setAttribute(a.name, a.value);
      if (s.type === 'module') {
        var inline = !s.src && orig.textContent;
        if (inline) {
          // Inline module → Blob URL with absolute import paths.
          // Virtual IDs (/@xxx) get @id/ prefix to match Vite's import rewrite.
          var code = orig.textContent.replace(
            /from\\s*["'](\\/[^"']+)["']/g,
            function(_, p) {
              return 'from "' + origin + p.replace(
                /(\\/(?:__[^/]+__\\/)?)(@(?!id\\/|vite\\/))/,  '$1@id//$2'
              ) + '"';
            }
          );
          var b = new Blob([code], { type: 'text/javascript' });
          s.src = URL.createObjectURL(b);
          s.onload = function() { URL.revokeObjectURL(s.src); resolve(); };
        } else {
          s.onload = resolve;
        }
        s.onerror = function() {
          if (inline) URL.revokeObjectURL(s.src);
          reportScriptError(s, inline);
          resolve();
        };
      } else {
        if (orig.textContent) s.textContent = orig.textContent;
        // Classic scripts are not awaited, but a failed load is still reported
        if (s.src) s.onerror = function() { reportScriptError(s, false); };
        resolve();
      }
      (orig.closest('head') ? document.head : document.body).appendChild(s);
    });
  }

  function reportScriptError(s, inline) {
    report('script', inline
      ? { message: 'Failed to load an inline module script' }
      : { message: 'Failed to load the script: ' + s.src, url: s.src });
  }
})();
</script>
</body></html>`
  }

  function resolveSession(target: PreviewSessionRef): PreviewSessionRecord | undefined {
    if (typeof target === 'string') {
      return previewSessions.get(target)
    }
    const record = previewSessions.get(target.id)
    return record?.session === target ? record : undefined
  }

  function reloadSession(record: PreviewSessionRecord): void {
    if (previewSessions.get(record.session.id) !== record) {
      return
    }
    record.loadToken = crypto.randomUUID()
    record.session.iframe.srcdoc = createBootstrapHtml(
      previewBasePath,
      record.context,
      record.loadToken
    )
  }

  function unmountSession(record: PreviewSessionRecord): void {
    if (previewSessions.get(record.session.id) !== record) {
      return
    }
    previewSessions.delete(record.session.id)
    record.session.iframe.remove()
    stopListeningPreviewMessagesIfIdle()
  }

  async function initialize(config: VrowzerConfig, signal: AbortSignal): Promise<boolean> {
    try {
      // The files are sent later, so copy them as they are when ready() is called
      const initialFiles = copyInitialFiles(config.files)
      // A preview always loads /index.html, so give the Web Worker a default
      if (!Object.hasOwn(initialFiles, '/index.html')) {
        initialFiles['/index.html'] = DEFAULT_INDEX_HTML
      }
      // Keep the files for build(). The Web Worker gets copies of them, so they can be shared.
      for (const [path, content] of Object.entries(initialFiles)) {
        projectFiles.set(path, content)
      }

      // 1. Create Web Worker + add as publisher target
      webWorker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' })
      const currentWebWorker = webWorker
      publisher.addTarget(currentWebWorker)

      // 2. Start loading dist client files immediately. This work is included
      // in the single Worker setup deadline below.
      let allFiles!: Record<string, string | ArrayBuffer>
      const allFilesReady = Promise.all([
        import('@vrowzer/vite-dev-server/dist/client/client.mjs?raw'),
        import('@vrowzer/vite-dev-server/dist/client/env.mjs?raw')
      ]).then(([{ default: clientCode }, { default: envCode }]) => {
        allFiles = {
          ...initialFiles,
          '/dist/client/client.mjs': clientCode,
          '/dist/client/env.mjs': envCode
        }
        return allFiles
      })

      // 3. Manage READY, config preparation, and SETUP_ACK as one operation.
      const webWorkerSetup = new Promise<void>((resolve, reject) => {
        currentWebWorker.onerror = event => {
          console.error('[Vrowzer] Web Worker error:', event.message, event.filename, event.lineno)
          const error = new Error(`Web Worker failed: ${event.message || 'unknown error'}`)
          reject(error)
        }

        void allFilesReady.catch(reject)

        currentWebWorker.onmessage = (event: MessageEvent) => {
          if (event.data.type !== V_WW_READY) {
            return
          }

          currentWebWorker.onmessage = (setupEvent: MessageEvent) => {
            if (setupEvent.data.type === V_WW_SETUP_ACK) {
              currentWebWorker.onmessage = null
              resolve()
              return
            }
            if (setupEvent.data.type === V_WW_SETUP_ERROR) {
              currentWebWorker.onmessage = null
              const errData = setupEvent.data.error ?? {}
              reject(new Error(`Web Worker setup failed: ${errData.message ?? 'unknown error'}`))
            }
          }

          void allFilesReady.then(
            files => {
              currentWebWorker.postMessage({
                type: V_WW_SETUP,
                config: {
                  root: '/',
                  base: previewBasePath,
                  publicDir: 'public',
                  optimizeDeps: { disabled: true },
                  experimental: {
                    importGlobRestoreExtension: false,
                    hmrPartialAccept: false,
                    bundledDev: false
                  }
                },
                options: { basePath: previewBasePath },
                files
              })
            },
            () => undefined
          )
        }
      })

      const webWorkerSetupWithTimeout = withTimeout(
        webWorkerSetup,
        resolved.webWorkerSetupTimeout,
        'Web Worker setup',
        signal
      )

      // 4. Initialize Service Worker and Web Worker in parallel
      // initServiceWorker waits for both controller.ready() AND listen() completion,
      // so when it resolves the SW is fully ready to accept MessageChannel connections.
      await abortable(
        Promise.all([
          initServiceWorker({
            scriptURL: withServiceWorkerVersion(
              new URL('./service-worker.ts', import.meta.url),
              resolved.serviceWorkerVersion
            ),
            version: resolved.serviceWorkerVersion,
            scope: resolved.serviceWorkerScope,
            readyTimeout: resolved.serviceWorkerReadyTimeout,
            signal
          }),
          webWorkerSetupWithTimeout
        ]),
        signal
      )

      // 5. Remember the Service Worker instance, and listen for the instances that start later.
      // A restarted Service Worker has lost the Web Worker channel of this instance.
      serviceWorkerInstanceId = getServiceWorkerInstanceId()
      listenServiceWorkerStarts()

      // 6. Forward controller events to Vrowzer emitter
      const controller = getController()
      if (controller) {
        const events = [
          'progress',
          'reloadSuggested',
          'changeState',
          'suspended',
          'terminated',
          'resumed'
        ] as const
        for (const event of events) {
          controllerSubscriptions.push(
            controller.on(event, ((...args: any[]) => {
              ;(_emitter.emit as any)(event, ...args)
            }) as any)
          )
        }
      }

      // 7. Establish MessageChannel (Service Worker ↔ Web Worker). The Service Worker forwards the
      // preview requests to the Web Worker, which has the project files.
      await establishChannel(signal)
      // dispose() may have been called while the last ACK was being delivered
      signal.throwIfAborted()

      // 8. File operations are accepted from now on, so listen for their acknowledgements
      listenFileSyncAcks(currentWebWorker)

      readyState = 'ready'
      // A Service Worker instance that started during ready() may not have the project
      const startedDuringInit = instanceStartedDuringInit
      instanceStartedDuringInit = null
      if (startedDuringInit !== null && startedDuringInit !== serviceWorkerInstanceId) {
        recoverServiceWorker(startedDuringInit)
      }
      return true
    } catch (error) {
      const releaseErrors: unknown[] = []
      releaseRuntime(releaseErrors)
      if (signal.aborted) {
        // dispose() aborted the initialization and reports these failures itself
        readyReleaseErrors.push(...releaseErrors)
        return false
      }

      readyState = 'failed'
      console.error('[Vrowzer] ready() failed:', error)
      for (const releaseError of releaseErrors) {
        console.error('[Vrowzer] Failed to release a resource after ready() failed:', releaseError)
      }
      return false
    }
  }

  /**
   * Tells the Service Worker that this instance no longer answers its previews, which then get 404.
   */
  function releasePreviews(): void {
    if (!channelRequested) {
      return
    }
    getServiceWorker()?.postMessage({
      type: V_WW_DISCONNECT_PORT,
      runtimeId
    } satisfies DisconnectWebWorkerPortMessage)
  }

  function dispose(): Promise<void> {
    if (disposePromise) {
      return disposePromise
    }
    readyState = 'disposed'
    const errors: unknown[] = []
    // Remove the handlers first, so that nothing reaches the host after dispose()
    attempt(errors, () => _emitter.dispose())
    readyAbortController?.abort(new Error('[Vrowzer] The instance was disposed'))
    rejectFileOperations(
      pending =>
        new Error(
          `${describeFileOperation(pending.operation, pending.path)} was cancelled by dispose()`
        )
    )
    stopRecovery(new Error('[Vrowzer] The instance was disposed'))
    const build = runningBuild
    if (build) {
      attempt(errors, () => build.cancel(new Error('[Vrowzer] build() was cancelled by dispose()')))
    }
    projectFiles.clear()

    disposePromise = (async () => {
      // An aborted ready() releases what it created and resolves to false
      await readyPromise
      errors.push(...readyReleaseErrors.splice(0))
      attempt(errors, releasePreviews)
      // Deleting entries while iterating a Map is safe, so no copy is needed
      for (const record of previewSessions.values()) {
        attempt(errors, () => unmountSession(record))
      }
      releaseRuntime(errors)
      if (errors.length > 0) {
        throw new AggregateError(errors, '[Vrowzer] dispose() could not release every resource')
      }
    })()
    return disposePromise
  }

  const instance: Vrowzer = {
    previewBasePath,
    on: _emitter.on,
    off: _emitter.off,
    once: _emitter.once,
    emit: _emitter.emit,
    ready(config: VrowzerConfig): Promise<boolean> {
      if (readyState === 'disposed') {
        return Promise.reject(new Error('[Vrowzer] ready() cannot be called after dispose()'))
      }
      if (readyState !== 'idle') {
        return Promise.reject(
          new Error(
            `[Vrowzer] ready() can only be called once per instance (current state: ${readyState})`
          )
        )
      }
      readyState = 'initializing'

      const abortController = new AbortController()
      readyAbortController = abortController
      readyPromise = initialize(config, abortController.signal).finally(() => {
        readyAbortController = null
      })
      return readyPromise
    },

    mount(container: HTMLElement, options: PreviewMountOptions): PreviewSession {
      assertNotDisposed('mount')
      if (!options || typeof options.id !== 'string' || options.id.length === 0) {
        throw new TypeError('[Vrowzer] mount() requires a non-empty preview session id')
      }

      const id = options.id
      const existing = previewSessions.get(id)
      if (existing) {
        return existing.session
      }

      const iframe = document.createElement('iframe')
      iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
      )
      iframe.setAttribute('credentialless', '')
      iframe.style.cssText = 'width: 100%; height: 100%; border: none;'
      container.appendChild(iframe)

      const params = options.params === undefined ? undefined : Object.freeze({ ...options.params })
      const context: Readonly<PreviewContext> = Object.freeze({
        id,
        ...(params === undefined ? {} : { params })
      })
      let session!: PreviewSession
      session = Object.freeze({
        id,
        iframe,
        container,
        reload: () => {
          const record = previewSessions.get(id)
          if (record?.session === session) {
            reloadSession(record)
          }
        },
        unmount: () => {
          const record = previewSessions.get(id)
          if (record?.session === session) {
            unmountSession(record)
          }
        }
      })
      const record: PreviewSessionRecord = { context, session, loadToken: crypto.randomUUID() }
      previewSessions.set(id, record)
      // Listen before the bootstrap document can report a failure
      listenPreviewMessages()

      // srcdoc bootstrap: fetch preview HTML via Service Worker
      iframe.srcdoc = createBootstrapHtml(previewBasePath, context, record.loadToken)
      return session
    },

    getSession(id: string): PreviewSession | undefined {
      return previewSessions.get(id)?.session
    },

    sessions(): readonly PreviewSession[] {
      return Object.freeze([...previewSessions.values()].map(record => record.session))
    },

    reloadPreview(target?: PreviewSessionRef): void {
      if (target === undefined) {
        for (const record of [...previewSessions.values()]) {
          reloadSession(record)
        }
        return
      }
      const record = resolveSession(target)
      if (record) {
        reloadSession(record)
      }
    },

    unmount(target?: PreviewSessionRef): void {
      if (target === undefined) {
        for (const record of [...previewSessions.values()]) {
          unmountSession(record)
        }
        return
      }
      const record = resolveSession(target)
      if (record) {
        unmountSession(record)
      }
    },

    addFile(filePath: string, content: string | ArrayBuffer): Promise<void> {
      return syncFile('addFile', filePath, options => {
        projectFiles.set(filePath, typeof content === 'string' ? content : content.slice(0))
        publisher.writeFile(filePath, content, options)
      })
    },

    updateFile(filePath: string, content: string | ArrayBuffer): Promise<void> {
      return syncFile('updateFile', filePath, options => {
        projectFiles.set(filePath, typeof content === 'string' ? content : content.slice(0))
        publisher.writeFile(filePath, content, options)
      })
    },

    deleteFile(filePath: string): Promise<void> {
      return syncFile('deleteFile', filePath, options => {
        projectFiles.delete(filePath)
        publisher.unlink(filePath, options)
      })
    },

    build(options: VrowzerBuildOptions = {}): Promise<VrowzerBuildResult> {
      if (readyState === 'disposed') {
        return Promise.reject(new Error('[Vrowzer] build() cannot be called after dispose()'))
      }
      if (readyState !== 'ready') {
        return Promise.reject(
          new Error(
            `[Vrowzer] build() can only be called after ready() resolves to true (current state: ${readyState})`
          )
        )
      }
      if (!isBuildEnabled()) {
        return Promise.reject(
          new Error(
            '[Vrowzer] build() is not enabled. Set `build: true` in the options of Vrowzer() from @vrowzer/vite-plugin.'
          )
        )
      }
      if (runningBuild) {
        return Promise.reject(
          new Error('[Vrowzer] build() is already running. Call it again after the build ends.')
        )
      }
      const { signal, ...buildOptions } = options
      if (signal?.aborted) {
        return Promise.reject(signal.reason)
      }
      // The snapshot: later file operations do not change the build
      const files = Object.fromEntries(projectFiles)
      return runBuild(files, buildOptions, signal)
    },

    dispose,

    [Symbol.asyncDispose]: dispose
  }

  return Object.freeze(instance)
}
