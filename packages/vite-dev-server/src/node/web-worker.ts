/**
 * Lightweight Web Worker entry point for @vrowser/vite-dev-server
 *
 * This module provides `createServer()` for Web Worker environments.
 * It is intentionally lightweight — it does NOT import @vrowser/rolldown
 * or any heavy modules statically. Heavy modules (DevEnvironment, rolldown,
 * transform pipeline) are loaded dynamically in `listen()` via
 * `import('./transformer')` (the ./transformer entry).
 *
 * This allows `createServer()` to register `self.onmessage` synchronously
 * at the Worker's top scope without being blocked by WASM top-level await.
 *
 * @module node/web-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createDebugger } from './utils'

// NOTE: Only type-only imports from heavy modules.
// Runtime imports of ./transformer happen inside listen() via dynamic import.
import type { ConnectServiceWorkerPortMessage, SetupWorkerMessage } from '../shared/messages'
import type { ViteDevServerForWorker } from './transformer'

const debug = createDebugger('vrowser:web-worker')

/**
 * Messages handled internally by createServer().
 * V_WW_SETUP and V_SW_CONNECT_PORT are protocol messages;
 * any other messages are forwarded to onUnhandledMessage.
 */
type InternalWorkerMessage = SetupWorkerMessage | ConnectServiceWorkerPortMessage

/**
 * This module defines the Web Worker server for @vrowser/vite-dev-server.
 * It handles the Web Worker side of the protocol for setup and Service Worker communication,
 */
export interface CreateServerOptions {
  /**
   * Base path for the Vite Dev Server routes.
   * @default '/'
   */
  basePath?: string
  /**
   * Callback for messages not handled by the server protocol.
   * Use this for app-specific messages (e.g. 'bundle').
   */
  onUnhandledMessage?: (event: MessageEvent) => void
}

/**
 * This module defines the Web Worker server for @vrowser/vite-dev-server.
 * It handles the Web Worker side of the protocol for setup and Service Worker communication,
 * as well as providing a lightweight API for the worker's main logic (e.g. DevEnvironment).
 */
export interface ListenableWorkerServer {
  /**
   * Start the worker server.
   *
   * Waits for `V_WW_SETUP` message from Main Thread,
   * dynamically imports the transformer module to load rolldown + DevEnvironment,
   * resolves config, initializes DevEnvironment,
   * and sends `V_WW_SETUP_ACK`.
   *
   * After `listen()` resolves, `V_SW_CONNECT_PORT` messages are
   * automatically handled for birpc channel establishment.
   *
   * @param timeout - Maximum time in ms to wait for V_WW_SETUP.
   *   Default: 30000 (30s). Set to 0 to disable timeout.
   */
  listen(timeout?: number): Promise<ViteDevServerForWorker>
}

/**
 * Create a Vite dev server for Web Worker environment.
 *
 * This function immediately registers `self.onmessage` to handle
 * protocol messages (`V_WW_SETUP`, `V_SW_CONNECT_PORT`).
 * It is safe to call at the Worker's top scope because it does not
 * import any heavy modules (rolldown, WASM) synchronously.
 *
 * @param workerScope - The Web Worker's global scope (`self`)
 * @param options - Server options
 * @returns A listenable server that resolves when `V_WW_SETUP` is received
 */
export function createServer(
  workerScope: DedicatedWorkerGlobalScope,
  options: CreateServerOptions = {},
): Readonly<ListenableWorkerServer> {
  // Promise resolvers for listen()
  let setupResolve: ((server: ViteDevServerForWorker) => void) | null = null
  let setupReject: ((error: Error) => void) | null = null

  // State: set after V_WW_SETUP completes
  let server: ViteDevServerForWorker | null = null

  // Register onmessage immediately (lightweight, no WASM)
  workerScope.onmessage = async (event: MessageEvent<InternalWorkerMessage>) => {
    const { type } = event.data ?? {} as InternalWorkerMessage

    switch (type) {
      case 'V_WW_SETUP': {
        try {
          debug?.('V_WW_SETUP received, loading transformer...')

          // Dynamic import — heavy modules loaded here for the first time
          const transformer = await import('./transformer')

          debug?.('transformer loaded, initializing...')
          await transformer.setupWorker(event.data.config, event.data.options)

          // Build ViteDevServerForWorker
          // TODO: construct proper server with DevEnvironment once Environment integration is done
          server = {
            config: event.data.config,
            environments: {} as any,
            transformRequest: async (url, _options) => {
              debug?.('transformRequest:', url)
              return null
            },
            warmupRequest: async (url) => {
              try { await server?.transformRequest(url) } catch { /* best-effort */ }
            },
            transformIndexHtml: async (url, html, _originalUrl) => {
              debug?.('transformIndexHtml:', url)
              return html
            },
          }

          workerScope.postMessage({ type: 'V_WW_SETUP_ACK' })
          debug?.('setup complete')

          setupResolve?.(server)
        } catch (error) {
          debug?.('V_WW_SETUP failed:', error)
          setupReject?.(error instanceof Error ? error : new Error(String(error)))
        }
        break
      }

      case 'V_SW_CONNECT_PORT': {
        const port = event.ports[0]
        if (!port) {
          debug?.('V_SW_CONNECT_PORT: no port received')
          break
        }
        if (!server) {
          debug?.('V_SW_CONNECT_PORT: server not initialized (V_WW_SETUP not received)')
          break
        }

        const { connectServiceWorkerPort } = await import('./transformer')
        await connectServiceWorkerPort(port, {
          transformRequest: (url, opts) => server!.transformRequest(url, opts),
          transformIndexHtml: (url, html, originalUrl) => server!.transformIndexHtml(url, html, originalUrl),
        })

        workerScope.postMessage({ type: 'V_SW_CONNECT_PORT_ACK' })
        debug?.('SW<->WW birpc channel established')
        break
      }

      default:
        options.onUnhandledMessage?.(event)
    }
  }

  return Object.freeze({
    listen(timeout = 30_000): Promise<ViteDevServerForWorker> {
      // If already initialized (unlikely but possible), resolve immediately
      if (server) {
        return Promise.resolve(server)
      }
      return new Promise<ViteDevServerForWorker>((resolve, reject) => {
        if (timeout > 0) {
          const timer = setTimeout(() => {
            setupResolve = null
            setupReject = null
            reject(new Error(`listen() timed out after ${timeout}ms waiting for V_WW_SETUP`))
          }, timeout)
          setupResolve = (s) => { clearTimeout(timer); resolve(s) }
          setupReject = (e) => { clearTimeout(timer); reject(e) }
        } else {
          setupResolve = resolve
          setupReject = reject
        }
      })
    }
  })
}

// Re-export types needed by consumers
export type {
  ConnectServiceWorkerPortAckMessage, ConnectServiceWorkerPortMessage, ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage, SetupWorkerAckMessage, SetupWorkerMessage, WebWorkerServiceWorkerChannelReadyMessage
} from '../shared/messages'
export type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
export type { ViteDevServerForWorker } from './transformer'

