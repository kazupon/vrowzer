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
  V_SW_INSTANCE_STARTED
} from '@vrowzer/vite-dev-server/messages'
import { abortable } from './abort.ts'
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
import type {
  FSInitMessage,
  FileSystemPublisher,
  FileSystemPublisherTarget
} from '@vrowzer/fs/watcher'
import type { SvcWorkerControllerEventMap } from '@vrowzer/service-worker/controller'

const DEFAULT_SERVICE_WORKER_READY_TIMEOUT = 60_000
const DEFAULT_WEB_WORKER_SETUP_TIMEOUT = 90_000
const DEFAULT_FILE_SYNC_TIMEOUT = 10_000

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

type FileSyncTarget = 'Web Worker' | 'Service Worker'

/**
 * Sends a file operation to the Workers, with its operation id.
 */
type SendFileOperation = (options: { id: string }) => void

/**
 * VrowzerOptions defines the configuration options for {@link Vrowzer}.
 */
export interface VrowzerOptions {
  /**
   * Preview URL pathname.
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
   * Timeout in milliseconds for the Web Worker and the Service Worker to apply a change made with
   * {@link Vrowzer.addFile}, {@link Vrowzer.updateFile} or {@link Vrowzer.deleteFile}.
   *
   * The Web Worker applies a change after the plugins' `watchChange` hooks finish. This timeout is
   * shorter than the 30 seconds that the Service Worker waits for the Web Worker to transform a
   * request, so with slow plugins or heavy transforms an operation can reject although the change
   * is applied later. Increase it in such environments. Writing the file again resynchronizes it.
   *
   * @default 10000
   */
  fileSyncTimeout?: number
}

/**
 * VrowzerConfig defines the configuration options for {@linkcode Vrowzer.ready}
 */
export interface VrowzerConfig {
  /**
   * A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer.
   * An ArrayBuffer is copied for the Workers when {@linkcode Vrowzer.ready} is called, and stays usable.
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
 * and adds events for preview sessions.
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
   * Emitted when Vrowzer has restored the project in a restarted Service Worker.
   *
   * The browser stops an idle Service Worker and starts it again for the next request or message.
   * The restarted Service Worker has lost the files and the Web Worker channel, so Vrowzer sends the
   * latest files and connects the channel again, without reloading the host page. File operations
   * called in the meantime are sent after the project is restored.
   */
  serviceWorkerRecovered: void
  /**
   * Emitted when Vrowzer could not restore the project in a restarted Service Worker: the Service
   * Worker failed to apply the files, or the recovery did not finish within
   * {@link VrowzerOptions.fileSyncTimeout}.
   *
   * File operations waiting for the Service Worker reject. Preview requests that the Service Worker
   * cannot serve yet wait for up to 10 seconds, and then get a 503 response. Vrowzer tries again when
   * the Service Worker restarts the next time. To start over, dispose the instance and create a new
   * one.
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
   * Ready for preview system initialization.
   *
   * This method initializes the Web Worker, Service Worker, and MessageChannel,
   * then syncs initial files to both workers.
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
   * The shared Service Worker, Web Worker, and virtual filesystem remain active.
   * Use {@link Vrowzer.dispose} to release the whole instance.
   *
   * @param target - A session ID or mounted session object.
   */
  unmount(target?: PreviewSessionRef): void
  /**
   * Adds a new file to the preview environment with the specified content.
   *
   * The promise resolves when later preview requests see the change: the Web Worker and the
   * Service Worker have written the file to their virtual filesystems, and the Web Worker has
   * invalidated the modules that depend on it. HMR updates of mounted previews are not awaited.
   *
   * It rejects without sending the change before {@link Vrowzer.ready} resolves to `true`, after it
   * fails, and after {@link Vrowzer.dispose}. It also rejects when a Worker fails to apply the change,
   * when the Web Worker reports an error, when the Workers do not reply within
   * {@link VrowzerOptions.fileSyncTimeout}, or when the instance is disposed first. The change may
   * be partly applied then; write the file again to resynchronize.
   *
   * @param filePath - The path of the file to be added.
   * @param content - The content of the file, which can be a string or an ArrayBuffer. An
   * ArrayBuffer is copied for the Workers and stays usable.
   */
  addFile(filePath: string, content: string | ArrayBuffer): Promise<void>
  /**
   * Updates the content of a specific file in the preview environment.
   *
   * The promise resolves and rejects as with {@link Vrowzer.addFile}.
   *
   * @param filePath - The path of the file to be updated.
   * @param content - The new content for the file, which can be a string or an ArrayBuffer. An
   * ArrayBuffer is copied for the Workers and stays usable.
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
   * Disposes this instance.
   *
   * An in-progress {@link Vrowzer.ready} is aborted and resolves to `false`. Every preview session
   * is unmounted, the Web Worker is terminated, Service Worker controller events are no longer
   * forwarded, and all event handlers are removed right away. The Service Worker registration and
   * its virtual filesystem are kept for other clients.
   *
   * File operations still waiting for the Workers reject. After disposal, `ready()` and the file
   * methods reject, `mount()` throws, and `unmount()` and `reloadPreview()` do nothing. Create a
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
}

/**
 * A file operation waiting for the Workers to acknowledge it.
 */
interface PendingFileOperation {
  operation: FileOperation
  path: string
  /**
   * Workers that have not acknowledged the operation yet.
   */
  waitingFor: Set<FileSyncTarget>
  resolve: () => void
  reject: (error: Error) => void
  /**
   * Whether the operation has been sent. An operation called while a restarted Service Worker is
   * being restored is sent after the recovery.
   */
  sent: boolean
  /**
   * Started when the operation is sent.
   */
  timer?: ReturnType<typeof setTimeout>
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
    fileSyncTimeout: options.fileSyncTimeout ?? DEFAULT_FILE_SYNC_TIMEOUT
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
 * Copies the files given to `ready()`, so that later changes by the caller do not reach the
 * Workers. ArrayBuffers are copied as well, and the caller's buffers are never transferred.
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
 * Builds the `V_FS_INIT` message, with text files in `files` and binary files in `binaryFiles`.
 */
function createFSInitMessage(allFiles: Record<string, string | ArrayBuffer>): FSInitMessage {
  const files: Record<string, string> = {}
  const binaryFiles: Record<string, ArrayBuffer> = {}
  for (const [path, content] of Object.entries(allFiles)) {
    if (typeof content === 'string') {
      files[path] = content
    } else {
      binaryFiles[path] = content
    }
  }
  return Object.keys(binaryFiles).length > 0
    ? { type: 'V_FS_INIT', files, binaryFiles }
    : { type: 'V_FS_INIT', files }
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
  let serviceWorkerTarget: FileSystemPublisherTarget | null = null
  // File operations waiting for acknowledgements, by operation id
  const pendingFileOperations = new Map<string, PendingFileOperation>()
  let stopListeningServiceWorkerAcks: (() => void) | null = null
  // Marks this instance as the owner of the Web Worker channel, for when several instances share
  // one Service Worker. The Service Worker does not use it yet. Created when ready() starts.
  let runtimeId: string | null = null
  // The latest files given to the Workers, to restore a restarted Service Worker
  const projectFiles = new Map<string, string | ArrayBuffer>()
  // The Service Worker instance that has the project of this instance
  let serviceWorkerInstanceId: string | null = null
  // A Service Worker instance that started while ready() was in progress
  let instanceStartedDuringInit: string | null = null
  let stopListeningServiceWorkerStarts: (() => void) | null = null
  // The recovery of a restarted Service Worker in progress
  let recovery: AbortController | null = null
  // File operations called during a recovery, sent in order after it
  const heldFileOperations: { id: string; send: SendFileOperation }[] = []

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
   * Releases what initialization created: Service Worker controller event forwarding,
   * the file sync targets and acknowledgement listener, and the Web Worker.
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
    const stopListeningAcks = stopListeningServiceWorkerAcks
    stopListeningServiceWorkerAcks = null
    if (stopListeningAcks) {
      attempt(errors, stopListeningAcks)
    }
    const target = serviceWorkerTarget
    serviceWorkerTarget = null
    if (target) {
      attempt(errors, () => publisher.removeTarget(target))
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

  /**
   * Rejects the pending file operations, or only those still waiting for `target`.
   */
  function rejectFileOperations(
    toError: (pending: PendingFileOperation) => Error,
    target?: FileSyncTarget
  ): void {
    // Deleting entries while iterating a Map is safe, so no copy is needed
    for (const [id, pending] of pendingFileOperations) {
      if (target === undefined || pending.waitingFor.has(target)) {
        settleFileOperation(id, toError(pending))
      }
    }
  }

  function handleFileSyncAck(target: FileSyncTarget, data: unknown): void {
    if (!isRecord(data) || data.type !== V_FS_ACK || typeof data.id !== 'string') {
      return
    }
    const pending = pendingFileOperations.get(data.id)
    // Unknown ids belong to another instance in the same page, or to settled operations
    if (!pending || !pending.waitingFor.has(target)) {
      return
    }
    if (data.error !== undefined) {
      const cause = toWorkerError(data.error)
      settleFileOperation(
        data.id,
        new Error(
          `${describeFileOperation(pending.operation, pending.path)} failed in the ${target}: ${cause.message}`,
          { cause }
        )
      )
      return
    }
    pending.waitingFor.delete(target)
    if (pending.waitingFor.size === 0) {
      settleFileOperation(data.id)
    }
  }

  /**
   * Receives file sync acknowledgements from the Workers, once the instance is ready.
   */
  function listenFileSyncAcks(worker: Worker): void {
    worker.onmessage = event => handleFileSyncAck('Web Worker', event.data)
    worker.onerror = event => {
      console.error('[Vrowzer] Web Worker error:', event.message, event.filename, event.lineno)
      const message = event.message || 'unknown error'
      rejectFileOperations(
        pending =>
          new Error(
            `${describeFileOperation(pending.operation, pending.path)} failed because the Web Worker reported an error: ${message}`
          ),
        'Web Worker'
      )
    }

    const container = getController()?.container
    if (container) {
      const handler = (event: MessageEvent) => handleFileSyncAck('Service Worker', event.data)
      container.addEventListener('message', handler)
      stopListeningServiceWorkerAcks = () => container.removeEventListener('message', handler)
    }
  }

  function couldNotSend(operation: FileOperation, path: string, error: unknown): Error {
    return new Error(
      `${describeFileOperation(operation, path)} could not be sent: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }

  /**
   * Sends a file operation to the Workers and waits until both have applied it.
   *
   * `prepare` runs right away and returns the step that sends the operation. While a restarted
   * Service Worker is being restored, that step runs after the recovery.
   */
  function syncFile(
    operation: FileOperation,
    path: string,
    prepare: () => SendFileOperation
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

    let send: SendFileOperation
    try {
      send = prepare()
    } catch (error) {
      return Promise.reject(couldNotSend(operation, path, error))
    }

    const waitingFor = new Set<FileSyncTarget>()
    if (webWorker) {
      waitingFor.add('Web Worker')
    }
    if (serviceWorkerTarget) {
      waitingFor.add('Service Worker')
    }
    const id = crypto.randomUUID()

    return new Promise<void>((resolve, reject) => {
      pendingFileOperations.set(id, { operation, path, waitingFor, resolve, reject, sent: false })
      if (recovery) {
        // Sent after the recovery, in the order the operations were called
        heldFileOperations.push({ id, send })
        return
      }
      sendFileOperation(id, send)
    })
  }

  /**
   * Sends a pending file operation, and waits for the replies up to `fileSyncTimeout`.
   */
  function sendFileOperation(id: string, send: SendFileOperation): void {
    const pending = pendingFileOperations.get(id)
    // dispose() may have rejected an operation held during a recovery
    if (!pending) {
      return
    }
    const { operation, path } = pending
    const timeout = resolved.fileSyncTimeout
    pending.timer = setTimeout(() => {
      const current = pendingFileOperations.get(id)
      if (current) {
        const targets = [...current.waitingFor].map(target => `the ${target}`).join(' and ')
        settleFileOperation(
          id,
          new Error(
            `${describeFileOperation(operation, path)} timed out after ${timeout}ms waiting for ${targets}`
          )
        )
      }
    }, timeout)
    pending.sent = true

    try {
      send({ id })
    } catch (error) {
      settleFileOperation(id, couldNotSend(operation, path, error))
    }
  }

  /**
   * Copies the content of a write now, since a write called during a recovery is sent later. The
   * returned step sends the copy and keeps it, to restore a restarted Service Worker.
   */
  function prepareWrite(path: string, content: string | ArrayBuffer): SendFileOperation {
    const copied = typeof content === 'string' ? content : content.slice(0)
    return options => {
      publisher.writeFile(path, copied, options)
      projectFiles.set(path, copied)
    }
  }

  /**
   * Listens for the Service Worker instances that start, to restore the project in a restarted one.
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
   * Restores the project of this instance in a restarted Service Worker, which has lost the files
   * and the Web Worker channel. File operations called in the meantime are held and sent after the
   * recovery. A recovery that does not finish within `fileSyncTimeout` fails, and is tried again
   * when the Service Worker restarts the next time.
   */
  function recoverServiceWorker(instanceId: string): void {
    serviceWorkerInstanceId = instanceId
    // A newer Service Worker instance started, so stop restoring the previous one
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
          for (const { id, send } of heldFileOperations.splice(0)) {
            sendFileOperation(id, send)
          }
          _emitter.emit('serviceWorkerRecovered', undefined)
        },
        (error: unknown) => {
          // A newer instance or dispose() stopped this recovery
          if (recovery !== controller) {
            return
          }
          recovery = null
          heldFileOperations.length = 0
          const reason = error instanceof Error ? error.message : String(error)
          // The held operations wait for the Service Worker as well
          rejectFileOperations(
            pending =>
              new Error(
                `${describeFileOperation(pending.operation, pending.path)} failed because the restarted Service Worker could not be restored: ${reason}`,
                { cause: error }
              ),
            'Service Worker'
          )
          _emitter.emit(
            'serviceWorkerRecoveryError',
            new Error(
              `[Vrowzer] Could not restore the project in the restarted Service Worker: ${reason}`,
              { cause: error }
            )
          )
        }
      )
      .finally(() => clearTimeout(timer))
  }

  /**
   * Sends the latest files to the restarted Service Worker with V_FS_INIT, and connects the Web
   * Worker channel again once it has applied them.
   */
  async function restoreServiceWorker(signal: AbortSignal): Promise<void> {
    const serviceWorker = getServiceWorker()
    if (!serviceWorker) {
      throw new Error('the Service Worker is not available')
    }
    // The operations sent so far are in the copy of the files, so the restarted Service Worker
    // applies them with V_FS_INIT. The previous instance can no longer acknowledge them.
    const coveredOperations = [...pendingFileOperations]
      .filter(([, pending]) => pending.sent && pending.waitingFor.has('Service Worker'))
      .map(([id]) => id)
    const id = crypto.randomUUID()
    serviceWorker.postMessage({ ...createFSInitMessage(Object.fromEntries(projectFiles)), id })
    await waitForServiceWorkerAck(id, signal)
    for (const operationId of coveredOperations) {
      handleFileSyncAck('Service Worker', { type: V_FS_ACK, id: operationId })
    }

    await establishChannel(signal)
    // The recovery may have been stopped while the last acknowledgement was being delivered
    signal.throwIfAborted()
  }

  /**
   * Waits for the Service Worker to acknowledge the message with `id`.
   */
  function waitForServiceWorkerAck(id: string, signal: AbortSignal): Promise<void> {
    const container = getController()?.container
    if (!container) {
      return Promise.reject(new Error('the Service Worker is not available'))
    }
    if (signal.aborted) {
      return Promise.reject(signal.reason)
    }
    return new Promise<void>((resolve, reject) => {
      const stop = () => {
        container.removeEventListener('message', handler)
        signal.removeEventListener('abort', onAbort)
      }
      const onAbort = () => {
        stop()
        reject(signal.reason)
      }
      const handler = (event: MessageEvent) => {
        const data: unknown = event.data
        if (!isRecord(data) || data.type !== V_FS_ACK || data.id !== id) {
          return
        }
        stop()
        if (data.error === undefined) {
          resolve()
          return
        }
        const cause = toWorkerError(data.error)
        reject(
          new Error(`the Service Worker failed to apply the restored files: ${cause.message}`, {
            cause
          })
        )
      }
      container.addEventListener('message', handler)
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * Stops the recovery in progress without reporting it. The held file operations are rejected by
   * the caller.
   */
  function stopRecovery(reason: Error): void {
    const current = recovery
    recovery = null
    heldFileOperations.length = 0
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

    // Wait for Service Worker's ACK
    const serviceWorkerAck = new Promise<void>(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === V_WW_CONNECT_PORT_ACK) {
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
      resolved.basePath,
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
    runtimeId = crypto.randomUUID()
    try {
      // The files are sent later, so copy them as they are when ready() is called
      const initialFiles = copyInitialFiles(config.files)
      // A preview always loads /index.html, so give both Workers the same default
      if (!Object.hasOwn(initialFiles, '/index.html')) {
        initialFiles['/index.html'] = DEFAULT_INDEX_HTML
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
                  base: resolved.basePath,
                  publicDir: 'public',
                  optimizeDeps: { disabled: true },
                  experimental: {
                    importGlobRestoreExtension: false,
                    hmrPartialAccept: false,
                    bundledDev: false
                  }
                },
                options: { basePath: resolved.basePath },
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
      // A restarted Service Worker has lost the project of this instance.
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

      // 7. Initialize Service Worker files and subscribe it to later changes. Keep the files, to
      // restore a restarted Service Worker.
      for (const [path, content] of Object.entries(allFiles)) {
        projectFiles.set(path, content)
      }
      const serviceWorker = getServiceWorker()
      if (serviceWorker) {
        serviceWorkerTarget = {
          postMessage: (msg: any, transfer?: any) => serviceWorker.postMessage(msg, transfer ?? [])
        }
        publisher.addTarget(serviceWorkerTarget)
        // The Web Worker already loaded these files during V_WW_SETUP.
        // Broadcasting them again emits add events and an initial HMR reload.
        serviceWorker.postMessage(createFSInitMessage(allFiles))
      }

      // 8. Establish MessageChannel (Service Worker ↔ Web Worker)
      await establishChannel(signal)
      // dispose() may have been called while the last ACK was being delivered
      signal.throwIfAborted()

      // 9. File operations are accepted from now on, so listen for their acknowledgements
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

    disposePromise = (async () => {
      // An aborted ready() releases what it created and resolves to false
      await readyPromise
      errors.push(...readyReleaseErrors.splice(0))
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
      iframe.srcdoc = createBootstrapHtml(resolved.basePath, context, record.loadToken)
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
      return syncFile('addFile', filePath, () => prepareWrite(filePath, content))
    },

    updateFile(filePath: string, content: string | ArrayBuffer): Promise<void> {
      return syncFile('updateFile', filePath, () => prepareWrite(filePath, content))
    },

    deleteFile(filePath: string): Promise<void> {
      return syncFile('deleteFile', filePath, () => options => {
        publisher.unlink(filePath, options)
        projectFiles.delete(filePath)
      })
    },

    dispose,

    [Symbol.asyncDispose]: dispose
  }

  return Object.freeze(instance)
}
