/**
 * Lightweight Web Worker entry point for @vrowzer/vite-dev-server
 *
 * This module provides `createServer()` for Web Worker environments.
 * It is intentionally lightweight — it does NOT import @vrowzer/rolldown
 * or any heavy modules statically. Heavy modules (DevEnvironment, rolldown,
 * transform pipeline) are loaded dynamically after `V_WW_SETUP`. The package
 * build routes `import('./transformer')` to the internal Worker aggregate.
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
import { connectSafeModulePathSync } from '../shared/rpc'

// NOTE(kazupon): Only type-only imports from heavy modules.
// Runtime imports of ./transformer happen after V_WW_SETUP via dynamic import.
import { V_WW_READY, V_WW_SETUP_ACK, V_WW_SETUP_ERROR, V_SW_CONNECT_PORT_ACK } from '../shared/messages'
import type { ConnectServiceWorkerPortMessage, SetupWorkerMessage, WorkerReadyMessage } from '../shared/messages'
import type { ViteDevServer } from './server/index'
import type { Plugin } from './plugin'
import type {
  TransformOptionsInternal,
} from './server/transformRequest'
import type { ViteDevServerForWorker } from './transformer'

const debug = createDebugger('vrowzer:web-worker')

/**
 * Messages handled internally by createServer().
 * V_WW_SETUP and V_SW_CONNECT_PORT are protocol messages;
 * any other messages are forwarded to onUnhandledMessage.
 */
type InternalWorkerMessage = SetupWorkerMessage | ConnectServiceWorkerPortMessage

/**
 * This module defines the Web Worker server for @vrowzer/vite-dev-server.
 * It handles the Web Worker side of the protocol for setup and Service Worker communication,
 */
export interface CreateServerOptions {
  /**
   * Base path for the Vite Dev Server routes.
   * @default '/'
   */
  basePath?: string
  /**
   * External FSWatcher to use for DevEnvironment (e.g. VirtualFSWatcher from subscriber).
   * If not provided, a NoopWatcher is used.
   */
  watcher?: import('#dep-types/chokidar').FSWatcher
  /**
   * User plugins to inject into the Vite dev server.
   * These are merged with the inline config plugins before resolving.
   */
  plugins?: Plugin[]
  /**
   * Additional Vite inline config from vrowzer.config.ts (resolve.alias, define, etc.).
   * Merged into the V_WW_SETUP config before resolveConfig().
   */
  inlineConfig?: Record<string, unknown>
  /**
   * Callback for messages not handled by the server protocol.
   * Use this for app-specific messages (e.g. 'bundle').
   */
  onUnhandledMessage?: (event: MessageEvent) => void
}

/**
 * This module defines the Web Worker server for @vrowzer/vite-dev-server.
 * It handles the Web Worker side of the protocol for setup and Service Worker communication,
 * as well as providing a lightweight API for the worker's main logic (e.g. DevEnvironment).
 */
export interface ListenableWorkerServer {
  /**
   * Start the worker server.
   *
   * Waits for setup triggered by the `V_WW_SETUP` message from Main Thread.
   * The message handler dynamically imports the transformer aggregate, resolves
   * config, initializes DevEnvironment, and sends `V_WW_SETUP_ACK`.
   *
   * After `listen()` resolves, `V_SW_CONNECT_PORT` messages are
   * automatically handled for birpc channel establishment.
   *
   * @param timeout - Maximum time in ms for V_WW_SETUP to arrive. The timer is
   * cleared when the message arrives and does not limit transformer setup.
   * Default: 30000 (30s). Set to 0 to disable the arrival timeout.
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
 * @returns A listenable server that resolves when setup completes
 */
export function createServer(
  workerScope: DedicatedWorkerGlobalScope,
  options: CreateServerOptions = {},
): Readonly<ListenableWorkerServer> {
  // Promise resolvers for listen()
  let setupResolve: ((server: ViteDevServerForWorker) => void) | null = null
  let setupReject: ((error: Error) => void) | null = null
  let setupTimer: ReturnType<typeof setTimeout> | null = null
  let setupMessageReceived = false
  let setupError: Error | null = null

  // State: set after V_WW_SETUP completes
  let server: ViteDevServerForWorker | null = null
  let ws: import('./server/ws').MessageChannelServer | null = null

  // Register onmessage immediately (lightweight, no WASM)
  workerScope.onmessage = async (event: MessageEvent<InternalWorkerMessage>) => {
    const { type } = event.data ?? {} as InternalWorkerMessage

    switch (type) {
      case 'V_WW_SETUP': {
        setupMessageReceived = true
        if (setupTimer !== null) {
          clearTimeout(setupTimer)
          setupTimer = null
        }
        try {
          debug?.('V_WW_SETUP received, loading transformer...')

          // Dynamic import — heavy modules loaded here for the first time
          const transformer = await import('./transformer')
          debug?.('transformer loaded, initializing...')

          const setupMsg = event.data as SetupWorkerMessage
          // Merge user config from vrowzer.config.ts into the setup config.
          // inlineConfig contains non-plugin fields (resolve.alias, define, etc.)
          // plugins are merged separately.
          let setupConfig = { ...setupMsg.config }
          if (options.inlineConfig) {
            setupConfig = { ...setupConfig, ...options.inlineConfig }
          }
          if (options.plugins?.length) {
            setupConfig.plugins = [...(setupConfig.plugins as any[] ?? []), ...options.plugins]
          }

          const result = await transformer.setupWorker(setupConfig, setupMsg.options, setupMsg.files, options.watcher)
          const { config, environments, watcher, moduleGraph } = result
          ws = result.ws
          const clientEnv = environments.client
          const devHtmlTransformFn = transformer.createDevHtmlTransformFn(config)

          // Build ViteDevServerForWorker with DevEnvironment
          server = {
            config,
            environments,
            fileSystem: transformer.fs,
            moduleGraph,
            watcher,
            ws,
            transformRequest: (url, options) => {
              debug?.('transformRequest:', url, options)
              if (server == null) {
                debug?.('transformRequest called before config initialization')
                return Promise.resolve(null)
              }

              return clientEnv?.transformRequest(url, {
                ...options,
                allowId(id: string) {
                  return (
                    id[0] === '\0' ||
                    !transformer.isServerAccessDeniedForTransform(
                      (server as unknown as ViteDevServer).config,
                      id,
                    )
                  )
                },
              } as TransformOptionsInternal) || Promise.resolve(null)
            },
            warmupRequest: async (url) => {
              debug?.('warmupRequest:', url)
              await clientEnv?.warmupRequest(url)
            },
            transformIndexHtml: (url, html, originalUrl) => {
              debug?.('transformIndexHtml:', url)
              return devHtmlTransformFn(server as unknown as ViteDevServer, url, html, originalUrl)
            },
          }

          // Setup HMR after server is ready
          await transformer.setupHMR(server as unknown as ViteDevServer)

          // Call configureServer hooks on user plugins.
          // Plugins like @vitejs/plugin-vue store the server reference in configureServer
          // to enable HMR code injection in SFC transforms. Without this, Vue SFCs won't
          // have import.meta.hot.accept() and all changes trigger full page reloads.
          for (const hook of config.getSortedPluginHooks('configureServer')) {
            await hook.call(
              clientEnv!.pluginContainer.minimalContext,
              server as unknown as ViteDevServer,
            )
          }

          // Match Vite's dev-server initialization order: configureServer
          // completes before the client buildStart lifecycle begins.
          await clientEnv!.pluginContainer.buildStart()

          // Send ACK to Main Thread with config and environment info
          workerScope.postMessage({ type: V_WW_SETUP_ACK })
          debug?.('setup complete')
          setupResolve?.(server!)
          setupResolve = null
          setupReject = null
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          setupError = err
          console.error('[vrowzer:web-worker] V_WW_SETUP failed:', err.message, err.stack)
          debug?.('V_WW_SETUP failed:', error)
          // Notify Main Thread of the failure so it can fail fast instead of timing out
          workerScope.postMessage({ type: V_WW_SETUP_ERROR, error: { message: err.message, stack: err.stack } })
          setupReject?.(err)
          setupResolve = null
          setupReject = null
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
        const serviceWorkerRpc = await connectServiceWorkerPort(port, {
          transformRequest: (url, opts) => server!.transformRequest(url, opts),
          transformIndexHtml: (url, html, originalUrl) => server!.transformIndexHtml(url, html, originalUrl),
          warmupRequest: (url) => server!.warmupRequest(url),
        }, (hmrPort, clientId) => {
          debug?.('HMR port received from SW, connecting to MessageChannelServer')
          ws!.handlePort(hmrPort, clientId)
        })

        await connectSafeModulePathSync(
          Object.values(server.environments),
          server.config.safeModulePaths,
          paths => serviceWorkerRpc.registerSafeModulePaths(paths),
        )

        workerScope.postMessage({ type: V_SW_CONNECT_PORT_ACK })
        debug?.('SW<->WW birpc channel established')
        break
      }

      default:
        options.onUnhandledMessage?.(event)
    }
  }

  // Signal to Main Thread that onmessage is registered and ready to receive V_WW_SETUP.
  // Without this, a race condition can occur: if the WW module evaluation takes time
  // (e.g. loading WASM via user plugins that import from "vite"), Main Thread may send
  // V_WW_SETUP before onmessage is set, causing the message to be lost.
  workerScope.postMessage({ type: V_WW_READY } satisfies WorkerReadyMessage)
  debug?.('V_WW_READY sent')

  return Object.freeze({
    listen(timeout = 30_000): Promise<ViteDevServerForWorker> {
      // If already initialized (unlikely but possible), resolve immediately
      if (server) {
        return Promise.resolve(server)
      }
      if (setupError) {
        return Promise.reject(setupError)
      }
      return new Promise<ViteDevServerForWorker>((resolve, reject) => {
        setupResolve = (resolvedServer) => {
          if (setupTimer !== null) {
            clearTimeout(setupTimer)
            setupTimer = null
          }
          resolve(resolvedServer)
        }
        setupReject = (error) => {
          if (setupTimer !== null) {
            clearTimeout(setupTimer)
            setupTimer = null
          }
          reject(error)
        }

        if (timeout > 0 && !setupMessageReceived) {
          setupTimer = setTimeout(() => {
            setupTimer = null
            setupResolve = null
            setupReject = null
            reject(new Error(`listen() timed out after ${timeout}ms waiting for V_WW_SETUP`))
          }, timeout)
        }
      })
    }
  })
}

// Re-export types needed by consumers
export type {
  ConnectServiceWorkerPortAckMessage, ConnectServiceWorkerPortMessage,
  ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage,
  SetupWorkerAckMessage, SetupWorkerMessage,
  WebWorkerServiceWorkerChannelReadyMessage,
} from '../shared/messages'
export type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
export type { ViteDevServerForWorker } from './transformer'
