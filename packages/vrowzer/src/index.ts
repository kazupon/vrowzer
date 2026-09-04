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
 * // Update files (triggers HMR)
 * vrowzer.updateFile(
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
import { createFileSystemPublisher } from '@vrowzer/fs/watcher'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_SETUP_ERROR,
  V_WW_CONNECT_PORT,
  V_SW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_SW_CONNECT_PORT_ACK
} from '@vrowzer/vite-dev-server/messages'
import { getServiceWorker, getController, initServiceWorker } from './controller.ts'
import { resolvePreviewBasePath } from './preview-base.ts'
import { resolveServiceWorkerScope } from './service-worker-scope.ts'
import { resolveServiceWorkerVersion, withServiceWorkerVersion } from './service-worker-version.ts'

import type { Emittable } from '@kazupon/jts-utils/event/emitter'
import type { FileSystemPublisher } from '@vrowzer/fs/watcher'
import type { SvcWorkerControllerEventMap } from '@vrowzer/service-worker/controller'

const DEFAULT_SERVICE_WORKER_READY_TIMEOUT = 60_000
const DEFAULT_WEB_WORKER_SETUP_TIMEOUT = 90_000

type ReadyState = 'idle' | 'initializing' | 'ready' | 'failed'

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
}

/**
 * VrowzerConfig defines the configuration options for {@linkcode Vrowzer.ready}
 */
export interface VrowzerConfig {
  /**
   * A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer.
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
 * Forwards all {@link SvcWorkerControllerEventMap} events from the underlying Service Worker controller.
 */
export type VrowzerEventMap = SvcWorkerControllerEventMap

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
   *
   * @param target - A session ID or mounted session object.
   */
  unmount(target?: PreviewSessionRef): void
  /**
   * Adds a new file to the preview environment with the specified content.
   *
   * @param filePath - The path of the file to be added.
   * @param content - The content of the file, which can be a string or an ArrayBuffer.
   */
  addFile(filePath: string, content: string | ArrayBuffer): void
  /**
   * Updates the content of a specific file in the preview environment.
   * @param filePath - The path of the file to be updated.
   * @param content - The new content for the file, which can be a string or an ArrayBuffer.
   */
  updateFile(filePath: string, content: string | ArrayBuffer): void
  /**
   * Deletes a specific file from the preview environment.
   * @param filePath - The path of the file to be deleted.
   */
  deleteFile(filePath: string): void
}

interface ResolvedVrowzerOptions {
  basePath: string
  serviceWorkerVersion: string
  serviceWorkerScope: string
  serviceWorkerReadyTimeout: number
  webWorkerSetupTimeout: number
}

interface PreviewSessionRecord {
  context: Readonly<PreviewContext>
  session: PreviewSession
}

function resolveVrowzerOptions(options: VrowzerOptions): ResolvedVrowzerOptions {
  return {
    basePath: resolvePreviewBasePath(options.basePath),
    serviceWorkerVersion: resolveServiceWorkerVersion(options.serviceWorkerVersion),
    serviceWorkerScope: resolveServiceWorkerScope(options.serviceWorkerScope),
    serviceWorkerReadyTimeout:
      options.serviceWorkerReadyTimeout ?? DEFAULT_SERVICE_WORKER_READY_TIMEOUT,
    webWorkerSetupTimeout: options.webWorkerSetupTimeout ?? DEFAULT_WEB_WORKER_SETUP_TIMEOUT
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
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

  function cleanupWebWorker(): void {
    if (!webWorker) {
      return
    }

    publisher.removeTarget(webWorker)
    webWorker.onmessage = null
    webWorker.onerror = null
    webWorker.terminate()
    webWorker = null
  }

  /**
   * Establish MessageChannel between Service Worker and Web Worker.
   * Creates a MessageChannel, sends one port to each side,
   * and waits for both ACKs (handshake + birpc ready).
   */
  async function establishChannel(): Promise<void> {
    const serviceWorker = getServiceWorker()
    if (!serviceWorker || !webWorker) {
      return
    }

    const channel = new MessageChannel()
    const controller = getController()

    // Wait for Service Worker's ACK
    const serviceWorkerAck = new Promise<void>(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === V_WW_CONNECT_PORT_ACK) {
          controller?.container.removeEventListener('message', handler)
          resolve()
        }
      }
      controller?.container.addEventListener('message', handler)
    })

    // Wait for Web Worker's ACK
    const webWorkerAck = new Promise<void>(resolve => {
      const prevHandler = webWorker!.onmessage
      webWorker!.onmessage = (event: MessageEvent) => {
        if (event.data.type === V_SW_CONNECT_PORT_ACK) {
          webWorker!.onmessage = prevHandler
          resolve()
          return
        }
        prevHandler?.call(webWorker!, event)
      }
    })

    // Transfer ports
    serviceWorker.postMessage({ type: V_WW_CONNECT_PORT }, [channel.port1])
    webWorker.postMessage({ type: V_SW_CONNECT_PORT }, [channel.port2])

    // Wait for both sides to complete handshake + birpc setup
    await withTimeout(
      Promise.all([serviceWorkerAck, webWorkerAck]),
      15000,
      'MessageChannel handshake'
    )
  }

  function createBootstrapHtml(previewUrl: string, context: Readonly<PreviewContext>): string {
    const serializedPreviewUrl = serializeInlineScriptValue(previewUrl)
    const serializedContext = serializeInlineScriptValue(context)

    // Fetch preview HTML via SW, then inject DOM and execute scripts manually.
    // We avoid document.write() (deprecated) because it doesn't guarantee
    // ESM module execution order in about:srcdoc iframes.
    return `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
(async () => {
  try {
    const res = await fetch(${serializedPreviewUrl});
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
    document.body.textContent = 'Preview load error: ' + e.message;
  }
})();

function execScript(orig, origin) {
  return new Promise(function(resolve) {
    var s = document.createElement('script');
    for (var a of orig.attributes) s.setAttribute(a.name, a.value);
    if (s.type === 'module') {
      if (!s.src && orig.textContent) {
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
      s.onerror = resolve;
    } else {
      if (orig.textContent) s.textContent = orig.textContent;
      resolve();
    }
    (orig.closest('head') ? document.head : document.body).appendChild(s);
  });
}
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
    record.session.iframe.srcdoc = createBootstrapHtml(resolved.basePath, record.context)
  }

  function unmountSession(record: PreviewSessionRecord): void {
    if (previewSessions.get(record.session.id) !== record) {
      return
    }
    previewSessions.delete(record.session.id)
    record.session.iframe.remove()
  }

  const instance: Vrowzer = {
    ..._emitter,
    async ready(config: VrowzerConfig): Promise<boolean> {
      if (readyState !== 'idle') {
        throw new Error(
          `[Vrowzer] ready() can only be called once per instance (current state: ${readyState})`
        )
      }
      readyState = 'initializing'

      try {
        // 1. Create Web Worker + add as publisher target
        webWorker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' })
        const currentWebWorker = webWorker
        publisher.addTarget(currentWebWorker)

        // 2. Start loading dist client files immediately. This work is included
        // in the single Worker setup deadline below.
        let allFiles!: Record<string, string>
        const allFilesReady = Promise.all([
          import('@vrowzer/vite-dev-server/dist/client/client.mjs?raw'),
          import('@vrowzer/vite-dev-server/dist/client/env.mjs?raw')
        ]).then(([{ default: clientCode }, { default: envCode }]) => {
          allFiles = {
            ...(config.files as Record<string, string>),
            '/dist/client/client.mjs': clientCode,
            '/dist/client/env.mjs': envCode
          }
          return allFiles
        })

        // 3. Manage READY, config preparation, and SETUP_ACK as one operation.
        const webWorkerSetup = new Promise<void>((resolve, reject) => {
          currentWebWorker.onerror = event => {
            console.error(
              '[Vrowzer] Web Worker error:',
              event.message,
              event.filename,
              event.lineno
            )
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
                      enableNativePlugin: 'v2',
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
          'Web Worker setup'
        )

        // 4. Initialize Service Worker and Web Worker in parallel
        // initServiceWorker waits for both controller.ready() AND listen() completion,
        // so when it resolves the SW is fully ready to accept MessageChannel connections.
        await Promise.all([
          initServiceWorker({
            scriptURL: withServiceWorkerVersion(
              new URL('./service-worker.ts', import.meta.url),
              resolved.serviceWorkerVersion
            ),
            version: resolved.serviceWorkerVersion,
            scope: resolved.serviceWorkerScope,
            readyTimeout: resolved.serviceWorkerReadyTimeout
          }),
          webWorkerSetupWithTimeout
        ])

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
            controller.on(event, ((...args: any[]) => {
              ;(_emitter.emit as any)(event, ...args)
            }) as any)
          }
        }

        // 7. Add Service Worker as publisher target + send initial files
        const serviceWorker = getServiceWorker()
        if (serviceWorker) {
          publisher.addTarget({
            postMessage: (msg: any, transfer?: any) =>
              serviceWorker.postMessage(msg, transfer ?? [])
          })
          publisher.initFiles(allFiles)
        }

        // 8. Establish MessageChannel (Service Worker ↔ Web Worker)
        await establishChannel()

        readyState = 'ready'
        return true
      } catch (error) {
        readyState = 'failed'
        cleanupWebWorker()
        console.error('[Vrowzer] ready() failed:', error)
        return false
      }
    },

    mount(container: HTMLElement, options: PreviewMountOptions): PreviewSession {
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
      const record = { context, session }
      previewSessions.set(id, record)

      // srcdoc bootstrap: fetch preview HTML via Service Worker
      iframe.srcdoc = createBootstrapHtml(resolved.basePath, context)
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

    addFile(filePath: string, content: string | ArrayBuffer): void {
      publisher.writeFile(filePath, content)
    },

    updateFile(filePath: string, content: string | ArrayBuffer): void {
      publisher.writeFile(filePath, content)
    },

    deleteFile(filePath: string): void {
      publisher.unlink(filePath)
    }
  }

  return Object.freeze(instance)
}
