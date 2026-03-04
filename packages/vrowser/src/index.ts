/**
 * Vrowser - Preview with Vite HMR flavor for the browser
 *
 * @example
 * ```ts
 * import { Vrowser } from 'vrowser'
 *
 * const vrowser = Vrowser({ basePath: '/__preview__/' })
 *
 * // Initialize with files
 * const ready = await vrowser.ready({
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
 *   vrowser.mount(document.getElementById('preview-container'))
 * }
 *
 * // Update files (triggers HMR)
 * vrowser.updateFile(
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

import { createFileSystemPublisher } from '@vrowser/fs/watcher'
import { getServiceWorker, initServiceWorker } from './controller.ts'

import type { FileSystemPublisher } from '@vrowser/fs/watcher'

/**
 * VrowserOptions defines the configuration options for {@link Vrowser}.
 */
export interface VrowserOptions {
  /** Preview base path (default: '/__preview__/') */
  basePath?: string
  /** Service Worker version for cache management (default: 'vrowser-v1') */
  serviceWorkerVersion?: string
  /** Service Worker scope (default: '/') */
  serviceWorkerScope?: string
}

/**
 * VrowserConfig defines the configuration options for {@linkcode Vrowser.ready}
 */
export interface VrowserConfig {
  /**
   * A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer.
   */
  files: Record<string, string | ArrayBuffer>
}

/**
 * The main interface for the Vrowser preview environment.
 */
export interface Vrowser {
  /**
   * Ready for preview system initialization.
   *
   * This method initializes the Web Worker, Service Worker, and MessageChannel,
   * then syncs initial files to both workers.
   *
   * @return A promise that resolves to `true` if the boot process is successful, or `false` if it fails.
   */
  ready(config: VrowserConfig): Promise<boolean>
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

interface ResolvedVrowserOptions {
  basePath: string
  serviceWorkerVersion: string
  serviceWorkerScope: string
}

function resolveVrowserOptions(options: VrowserOptions): ResolvedVrowserOptions {
  return {
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'vrowser-v1',
    serviceWorkerScope: options.serviceWorkerScope ?? '/'
  }
}

/**
 * Factory function to create a {@link Vrowser} instance.
 * @param options - Configuration options for the Vrowser instance.
 * @returns A read-only Vrowser instance.
 */
export function Vrowser(options: VrowserOptions = {}): Readonly<Vrowser> {
  const resolved = resolveVrowserOptions(options)

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

    // Wait for Service Worker's ACK
    const serviceWorkerAck = new Promise<void>(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'V_WW_CONNECT_PORT_ACK') {
          navigator.serviceWorker.removeEventListener('message', handler)
          resolve()
        }
      }
      navigator.serviceWorker.addEventListener('message', handler)
    })

    // Wait for Web Worker's ACK
    const webWorkerAck = new Promise<void>(resolve => {
      const prevHandler = webWorker!.onmessage
      webWorker!.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'V_SW_CONNECT_PORT_ACK') {
          webWorker!.onmessage = prevHandler
          resolve()
          return
        }
        prevHandler?.call(webWorker!, event)
      }
    })

    // Transfer ports
    serviceWorker.postMessage({ type: 'V_WW_CONNECT_PORT' }, [channel.port1])
    webWorker.postMessage({ type: 'V_SW_CONNECT_PORT' }, [channel.port2])

    // Wait for both sides to complete handshake + birpc setup
    await Promise.all([serviceWorkerAck, webWorkerAck])
  }

  function createBootstrapHtml(previewUrl: string): string {
    return `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
(async () => {
  try {
    const res = await fetch('${previewUrl}');
    const html = await res.text();
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    document.body.textContent = 'Preview load error: ' + e.message;
  }
})();
</script>
</body></html>`
  }

  const instance: Vrowser = {
    async ready(config: VrowserConfig): Promise<boolean> {
      try {
        // 1. Create Web Worker + add as publisher target
        webWorker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' })
        publisher.addTarget(webWorker)

        // 2. V_WW_SETUP: send config and wait for ACK
        const webWorkerReady = new Promise<void>(resolve => {
          const prevHandler = webWorker!.onmessage
          webWorker!.onmessage = (event: MessageEvent) => {
            if (event.data.type === 'V_WW_SETUP_ACK') {
              webWorker!.onmessage = prevHandler
              resolve()
              return
            }
            prevHandler?.call(webWorker!, event)
          }
        })

        // 3. Import dist client files and merge with user files
        const { default: clientCode } =
          await import('@vrowser/vite-dev-server/dist/client/client.mjs?raw')
        const { default: envCode } =
          await import('@vrowser/vite-dev-server/dist/client/env.mjs?raw')
        const allFiles: Record<string, string> = {
          ...(config.files as Record<string, string>),
          '/dist/client/client.mjs': clientCode,
          '/dist/client/env.mjs': envCode
        }

        // 4. Send V_WW_SETUP message
        webWorker.postMessage({
          type: 'V_WW_SETUP',
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

        // 5. Initialize Service Worker and Web Worker in parallel
        await Promise.all([
          initServiceWorker({
            scriptURL: new URL('./service-worker.ts', import.meta.url),
            version: resolved.serviceWorkerVersion,
            scope: resolved.serviceWorkerScope
          }),
          webWorkerReady
        ])

        // 6. Add Service Worker as publisher target + send initial files
        const serviceWorker = getServiceWorker()
        if (serviceWorker) {
          publisher.addTarget({
            postMessage: (msg: any, transfer?: any) =>
              serviceWorker.postMessage(msg, transfer ?? [])
          })
          publisher.initFiles(allFiles)
        }

        // 7. Establish MessageChannel (Service Worker ↔ Web Worker)
        await establishChannel()

        return true
      } catch (error) {
        console.error('[Vrowser] ready() failed:', error)
        return false
      }
    },

    mount(container: HTMLElement): void {
      iframe = document.createElement('iframe')
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
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
