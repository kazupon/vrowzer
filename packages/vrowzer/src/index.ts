/**
 * Vrowzer - Preview with Vite HMR flavor for the browser
 *
 * @example
 * ```ts
 * import { Vrowzer } from 'vrowzer'
 *
 * const vrowzer = Vrowzer({ basePath: '/__preview__/' })
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
 *   vrowzer.mount(document.getElementById('preview-container'))
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

import type { Emittable } from '@kazupon/jts-utils/event/emitter'
import type { FileSystemPublisher } from '@vrowzer/fs/watcher'
import type { SvcWorkerControllerEventMap } from '@vrowzer/service-worker/controller'

/**
 * VrowzerOptions defines the configuration options for {@link Vrowzer}.
 */
export interface VrowzerOptions {
  /** Preview base path (default: '/__preview__/') */
  basePath?: string
  /** Service Worker version for cache management (default: 'vrowzer-v1') */
  serviceWorkerVersion?: string
  /** Service Worker scope (default: '/') */
  serviceWorkerScope?: string
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
   * @param container - A DOM element where the preview iframe will be mounted.
   */
  mount(container: HTMLElement): void
  /**
   * Reloads the preview iframe
   */
  reloadPreview(): void
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
}

function resolveVrowzerOptions(options: VrowzerOptions): ResolvedVrowzerOptions {
  return {
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'vrowzer-v1',
    serviceWorkerScope: options.serviceWorkerScope ?? '/'
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

/**
 * Factory function to create a {@link Vrowzer} instance.
 * @param options - Configuration options for the Vrowzer instance.
 * @returns A read-only Vrowzer instance.
 */
export function Vrowzer(options: VrowzerOptions = {}): Readonly<Vrowzer> {
  const resolved = resolveVrowzerOptions(options)

  const _emitter = Emitter<VrowzerEventMap>()
  const publisher: FileSystemPublisher = createFileSystemPublisher()
  let webWorker: Worker | null = null
  let iframe: HTMLIFrameElement | null = null

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

  function createBootstrapHtml(previewUrl: string): string {
    // Fetch preview HTML via SW, then inject DOM and execute scripts manually.
    // We avoid document.write() (deprecated) because it doesn't guarantee
    // ESM module execution order in about:srcdoc iframes.
    return `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
(async () => {
  try {
    const res = await fetch('${previewUrl}');
    const html = await res.text();
    const origin = new URL(res.url).origin;
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    // Copy non-script nodes
    for (const n of [...parsed.head.childNodes])
      if (n.nodeName !== 'SCRIPT') document.head.appendChild(document.importNode(n, true));
    document.body.innerHTML = '';
    for (const n of [...parsed.body.childNodes])
      if (n.nodeName !== 'SCRIPT') document.body.appendChild(document.importNode(n, true));

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

  const instance: Vrowzer = {
    ..._emitter,
    async ready(config: VrowzerConfig): Promise<boolean> {
      try {
        // 1. Create Web Worker + add as publisher target
        webWorker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' })
        webWorker.onerror = event => {
          console.error('[Vrowzer] Web Worker error:', event.message, event.filename, event.lineno)
        }
        publisher.addTarget(webWorker)

        // 2. Import dist client files and merge with user files
        const { default: clientCode } =
          await import('@vrowzer/vite-dev-server/dist/client/client.mjs?raw')
        const { default: envCode } =
          await import('@vrowzer/vite-dev-server/dist/client/env.mjs?raw')
        const allFiles: Record<string, string> = {
          ...(config.files as Record<string, string>),
          '/dist/client/client.mjs': clientCode,
          '/dist/client/env.mjs': envCode
        }

        // 3. Wait for WW to signal readiness, then send setup config and wait for ACK.
        // V_WW_READY is sent by createServer() after self.onmessage is registered.
        // Without this handshake, V_WW_SETUP can be lost if the WW module evaluation
        // takes time (e.g. when user plugins import heavy modules via "vite" alias).
        const webWorkerReady = new Promise<void>((resolve, reject) => {
          webWorker!.onmessage = (event: MessageEvent) => {
            if (event.data.type === V_WW_READY) {
              // WW's self.onmessage is registered — safe to send V_WW_SETUP now.
              // Replace handler to wait for ACK/ERROR.
              webWorker!.onmessage = (event: MessageEvent) => {
                if (event.data.type === V_WW_SETUP_ACK) {
                  webWorker!.onmessage = null
                  resolve()
                  return
                }
                if (event.data.type === V_WW_SETUP_ERROR) {
                  webWorker!.onmessage = null
                  const errData = event.data.error ?? {}
                  reject(
                    new Error(`Web Worker setup failed: ${errData.message ?? 'unknown error'}`)
                  )
                  return
                }
              }

              // Send V_WW_SETUP after receiving V_WW_READY
              webWorker!.postMessage({
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
                files: allFiles
              })
            }
          }
        })

        // 5. Initialize Service Worker and Web Worker in parallel
        // initServiceWorker waits for both controller.ready() AND listen() completion,
        // so when it resolves the SW is fully ready to accept MessageChannel connections.
        await Promise.all([
          initServiceWorker({
            scriptURL: new URL('./service-worker.ts', import.meta.url),
            version: resolved.serviceWorkerVersion,
            scope: resolved.serviceWorkerScope
          }),
          withTimeout(webWorkerReady, 30000, 'Web Worker setup')
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

        return true
      } catch (error) {
        console.error('[Vrowzer] ready() failed:', error)
        return false
      }
    },

    mount(container: HTMLElement): void {
      iframe = document.createElement('iframe')
      iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
      )
      iframe.setAttribute('credentialless', '')
      iframe.style.cssText = 'width: 100%; height: 100%; border: none;'
      container.appendChild(iframe)

      // srcdoc bootstrap: fetch preview HTML via Service Worker
      iframe.srcdoc = createBootstrapHtml(resolved.basePath)
    },

    reloadPreview(): void {
      if (iframe) {
        iframe.srcdoc = createBootstrapHtml(resolved.basePath)
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
