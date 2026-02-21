/**
 * Service Worker entry point for @vrowser/vite-dev-server
 *
 * This module exports everything needed to run the Vite dev server
 * as a proxy inside a Service Worker: server creation, middleware,
 * MessageChannel HMR server, and configuration.
 *
 * @module node/service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createSvcWorkerServer } from '@vrowser/service-worker-server'
import { createBirpc } from 'birpc'
import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import { isResolvedConfig, resolveConfig } from './config'
import { initPublicFiles } from './publicDir'
import { baseMiddleware } from './server/middlewares/base'
import { errorMiddleware } from './server/middlewares/error'
import { htmlFallbackMiddleware } from './server/middlewares/htmlFallback'
import {
  indexHtmlMiddleware
} from './server/middlewares/indexHtml'
import { notFoundMiddleware } from './server/middlewares/notFound'
import { servePublicMiddleware, serveRawFsMiddleware, serveStaticMiddleware } from './server/middlewares/static'
import { timeMiddleware } from './server/middlewares/time'
import { transformMiddleware } from './server/middlewares/transform'
import {
  BasicMinimalPluginContext,
  basePluginContextMeta
} from './server/pluginContainer'
import {
  createDebugger
} from './utils'
import {
  createNoopWatcher,
  getResolvedOutDirs,
  resolveChokidarOptions,
  resolveEmptyOutDir,
} from './watch'

const debug = createDebugger('vrowser:service-worker')

import type { FSWatcher, WatchOptions } from '#dep-types/chokidar'
import type { ListenOptions, SvcWorkerServer } from '@vrowser/service-worker-server'
import type { BlankSchema, Env, MiddlewareHandler } from 'hono/types'
import type { ConnectWebWorkerPortMessage, WebWorkerServiceWorkerChannelReadyMessage } from '../shared/messages'
import type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
import type { InlineConfig, ResolvedConfig } from './config'
import type { CommonServerOptions } from './http'
import type { MinimalPluginContextWithoutEnvironment } from './plugin'
import type { DevEnvironment } from './server/environment'
import type { HmrOptions } from './server/hmr'
import type { ViteDevServer } from './server/index'
import type { ShortcutsState } from './shortcuts'
import type { RequiredExceptFor } from './typeUtils'

export * from './server/middlewares/utils'

export interface ServerOptions extends CommonServerOptions {
  /**
   * Configure HMR-specific options (port, host, path & protocol)
   */
  hmr?: HmrOptions | boolean
  /**
   * Do not start the websocket connection.
   * @experimental
   */
  ws?: false
  /**
   * Warm-up files to transform and cache the results in advance. This improves the
   * initial page load during server starts and prevents transform waterfalls.
   */
  warmup?: {
    /**
     * The files to be transformed and used on the client-side. Supports glob patterns.
     */
    clientFiles?: string[]
    /**
     * The files to be transformed and used in SSR. Supports glob patterns.
     */
    ssrFiles?: string[]
  }
  /**
   * chokidar watch options or null to disable FS watching
   * https://github.com/paulmillr/chokidar/tree/3.6.0#api
   */
  watch?: WatchOptions | null
  /**
   * Create Vite dev server to be used as a middleware in an existing server
   * @default false
   */
  middlewareMode?:
  | boolean
  | {
    /**
     * Parent server instance to attach to
     *
     * This is needed to proxy MessageChannel connections
     */
    server: HttpServer
  }
  /**
   * Options for files served via '/\@fs/'.
   */
  fs?: FileSystemServeOptions
  /**
   * Origin for the generated asset URLs.
   *
   * @example `http://127.0.0.1:8080`
   */
  origin?: string
  /**
   * Pre-transform known direct imports
   * @default true
   */
  preTransformRequests?: boolean
  /**
   * Whether or not to ignore-list source files in the dev server sourcemap, used to populate
   * the [`x_google_ignoreList` source map extension](https://developer.chrome.com/blog/devtools-better-angular-debugging/#the-x_google_ignorelist-source-map-extension).
   *
   * By default, it excludes all paths containing `node_modules`. You can pass `false` to
   * disable this behavior, or, for full control, a function that takes the source path and
   * sourcemap path and returns whether to ignore the source path.
   */
  sourcemapIgnoreList?:
  | false
  | ((sourcePath: string, sourcemapPath: string) => boolean)
  /**
   * Backward compatibility. The buildStart and buildEnd hooks were called only once for
   * the client environment. This option enables per-environment buildStart and buildEnd hooks.
   * @default false
   * @experimental
   */
  perEnvironmentStartEndDuringDev?: boolean
  /**
   * Backward compatibility. The watchChange hook was called only once for the client environment.
   * This option enables per-environment watchChange hooks.
   * @default false
   * @experimental
   */
  perEnvironmentWatchChangeDuringDev?: boolean
  /**
   * Run HMR tasks, by default the HMR propagation is done in parallel for all environments
   * @experimental
   */
  hotUpdateEnvironments?: (
    server: ViteDevServer,
    hmr: (environment: DevEnvironment) => Promise<void>,
  ) => Promise<void>
}

export interface ResolvedServerOptions extends Omit<
  RequiredExceptFor<
    ServerOptions,
    | 'host'
    | 'https'
    | 'proxy'
    | 'hmr'
    | 'ws'
    | 'watch'
    | 'origin'
    | 'hotUpdateEnvironments'
  >,
  'fs' | 'middlewareMode' | 'sourcemapIgnoreList'
> {
  fs: Required<FileSystemServeOptions>
  middlewareMode: NonNullable<ServerOptions['middlewareMode']>
  sourcemapIgnoreList: Exclude<
    ServerOptions['sourcemapIgnoreList'],
    false | undefined
  >
}

export interface FileSystemServeOptions {
  /**
   * Strictly restrict file accessing outside of allowing paths.
   *
   * Set to `false` to disable the warning
   *
   * @default true
   */
  strict?: boolean

  /**
   * Restrict accessing files outside the allowed directories.
   *
   * Accepts absolute path or a path relative to project root.
   * Will try to search up for workspace root by default.
   */
  allow?: string[]

  /**
   * Restrict accessing files that matches the patterns.
   *
   * This will have higher priority than `allow`.
   * picomatch patterns are supported.
   *
   * @default ['.env', '.env.*', '*.{crt,pem}', '**\/.git/**']
   */
  deny?: string[]
}

/**
 * Environment type for Vite Dev Server running in Service Worker
 */
export interface ViteEnv extends Env {
  // Bindings available throughout the request lifecycle
  Bindings: {}
  // Variables set during request processing
  Variables: {
    /** Rewritten URL after base stripping (set by baseMiddleware) */
    rewrittenUrl?: string
  }
}

export type ServerHook = (
  this: MinimalPluginContextWithoutEnvironment,
  server: ViteDevServer,
) => (() => void) | void | Promise<(() => void) | void>

export type HttpServer = SvcWorkerServer<ConnectWebWorkerPortMessage>

/**
 * Vite Dev Server that can be started by calling `listen()`
 */
export interface ListenableViteDevServer {
  /**
   * Custom middlewares handler.
   *
   * - Can be used to attach custom middlewares to the dev server.
   * - Can also be used as the handler function in Service Worker's fetch event
   * - Compatible with Web Standard Request/Response API
   *
   * @example
   * ```ts
   * const listenableServer = createServer(self, { server: { middlewareMode: true } })
   *
   * // Add custom middleware before default handlers
   * listenableServer.middlewares.push('/__preview__/*', (c) => {
   *   return c.text('Preview content')
   * })
   *
   * // Start listening for fetch events
   * const server = listenableServer.listen() // get ViteDevServer instance after listening
   * ```
   */
  middlewares: MiddlewareHandler<ViteEnv, string>[]
  /**
   * Start the server
   *
   * @returns The ViteDevServer instance
   */
  listen(): Promise<ViteDevServerForServiceWorker>
}

/**
 * Subset of ViteDevServer for Service Worker environment.
 *
 * The full ViteDevServer (defined in server/index.ts) is the single source of truth.
 * This type picks the properties needed by the SW proxy: fetch handling, middleware,
 * and birpc-delegated transform methods.
 */
export type ViteDevServerForServiceWorker = Pick<ViteDevServer,
  | 'config'
  | 'watcher'
  | 'middlewares'
  | 'httpServer'
  | 'resolvedUrls'
  | 'transformRequest'
  | 'warmupRequest'
  | 'transformIndexHtml'
  | 'close'
  | 'openBrowser'
  | '_setInternalServer'
  | '_restartPromise'
  | '_forceOptimizeOnRestart'
  | '_shortcutsState'
  | '_currentServerPort'
  | '_configServerPort'
  | '_ssrCompatModuleRunner'
>

/**
 * Options for {@link createServer} function.
 */
export interface CreateServerOptions {
  /**
   * Whether to start listening for fetch events immediately.
   * When true, the fetch event handler is registered synchronously.
   */
  listen?: boolean
  /**
   * Version string for the service worker.
   */
  version?: string
  /**
   * Base path for the Vite Dev Server routes.
   * All routes will be prefixed with this path.
   *
   * @example '/__preview__' - Server handles /__preview__/* requests
   * @default '/'
   */
  basePath?: string
  /**
   * FSWawtcher factory function to create a custom FSWatcher instance.
   */
  watcherFactory?: (targets: string[], options: WatchOptions) => FSWatcher
  /**
   * @internal
   */
  previousEnvironments?: Record<string, DevEnvironment>
  /**
   * @internal
   */
  previousShortcutsState?: ShortcutsState<ViteDevServer>
}

export function createServer(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  inlineConfig: InlineConfig | ResolvedConfig = {
    // TODO(kazupon): resolve in ../config.ts
    base: '/',
    publicDir: 'public',
    experimental: {
      importGlobRestoreExtension: false,
      renderBuiltUrl: () => undefined,
      hmrPartialAccept: false,
      enableNativePlugin: 'v2',
      bundledDev: false,
    }
  },
  options: CreateServerOptions = {},
): Readonly<ListenableViteDevServer> {
  const { server: serverConfig } = inlineConfig as InlineConfig | ResolvedConfig
  const middlewareMode = !!serverConfig?.middlewareMode

  let middlewares = new Hono<ViteEnv, BlankSchema, '/'>()
  const customMiddlewares: MiddlewareHandler<ViteEnv, string>[] = []
  const httpServer = createSvcWorkerServer<ConnectWebWorkerPortMessage>(serviceWorkerScope, {
    version: options.version ?? '0.0.0',
    claimOnActivate: true,
    debug: createDebugger('vrowser:svc-worker-server')!,
  })
  const fetchHandler = handle(middlewares)

  // Register fetch handler immediately (synchronously)
  // This is critical for Service Workers which require fetch listeners during script evaluation
  httpServer.setFetchHandler(fetchHandler)

  /**
   * Start the Vite Dev Server
   */
  async function listen(): Promise<ViteDevServerForServiceWorker> {
    const config = isResolvedConfig(inlineConfig)
      ? inlineConfig
      : await resolveConfig(inlineConfig, 'serve')
    debug?.('config:', config)

    const initPublicFilesPromise = initPublicFiles(config)

    const { root, server: serverConfig } = config
    const basePath = options.basePath || '/'

    // Setup base path for hono middlewares
    if (basePath !== '/') {
      middlewares = middlewares.basePath(basePath)
    }

    const resolvedOutDirs = getResolvedOutDirs(
      config.root,
      config.build.outDir,
      config.build.rollupOptions.output,
    )
    const emptyOutDir = resolveEmptyOutDir(
      config.build.emptyOutDir,
      config.root,
      resolvedOutDirs,
    )
    const resolvedWatchOptions = resolveChokidarOptions(
      {
        disableGlobbing: true,
        ...serverConfig.watch,
      },
      resolvedOutDirs,
      emptyOutDir,
      config.cacheDir,
    )

    const publicFiles = await initPublicFilesPromise
    const { publicDir } = config

    const watchEnabled = serverConfig.watch !== null
    const watcher = watchEnabled && options.watcherFactory
      ? options.watcherFactory([
        ...(config.experimental.bundledDev ? [] : [root]),
        ...config.configFileDependencies,
        // ...getEnvFilesForMode(config.mode, config.envDir),
        // Watch the public directory explicitly because it might be outside
        // of the root directory.
        ...(publicDir && publicFiles ? [publicDir] : []),
      ], resolvedWatchOptions)
      : createNoopWatcher(resolvedWatchOptions)

    const closeHttpServer = createServerCloseFn(httpServer)

    // birpc RPC client for delegating transform to Web Worker.
    // Initialized dynamically when a V_WW_CONNECT_PORT connection arrives
    // via the httpServer's connection event (after startServer enables listenConnections).
    let workerRpc: ReturnType<typeof createBirpc<WorkerFunctions, ServiceWorkerFunctions>> | null = null

    // const devHtmlTransformFn = createDevHtmlTransformFn(config)

    // Promise used by `server.close()` to ensure `closeServer()` is only called once
    let closeServerPromise: Promise<void> | undefined
    const closeServer = async () => {
      // if (!middlewareMode) {
      //   teardownSIGTERMListener(closeServerAndExit)
      // }

      await Promise.allSettled([
        // watcher.close(),
        closeHttpServer(),
        server._ssrCompatModuleRunner?.close(),
      ])
      server.resolvedUrls = null
      server._ssrCompatModuleRunner = undefined
    }

    let server: ViteDevServerForServiceWorker = {
      config,
      middlewares,
      httpServer,
      watcher,

      resolvedUrls: null, // will be set on listen

      transformRequest(url, options) {
        if (!workerRpc) {
          throw new Error('[@vrowser/vite-dev-server/service-worker] transformRequest requires workerPort to be set in CreateServerOptions')
        }
        return workerRpc.transformRequest(url, options)
      },
      warmupRequest(url, options) {
        // warmup is best-effort, silently ignore errors
        return this.transformRequest(url, options).then(() => { }).catch(() => { })
      },
      transformIndexHtml(url, html, originalUrl) {
        if (!workerRpc) {
          throw new Error('[@vrowser/vite-dev-server/service-worker] transformIndexHtml requires workerPort to be set in CreateServerOptions')
        }
        return workerRpc.transformIndexHtml(url, html, originalUrl)
      },
      openBrowser() {
        debug?.('not supported: server.openBrowser()')
      },
      async close() {
        if (!closeServerPromise) {
          closeServerPromise = closeServer()
        }
        return closeServerPromise
      },
      _setInternalServer(_server: ViteDevServer) {
        // Rebind internal the server variable so functions reference the user
        // server instance after a restart
        server = _server as unknown as ViteDevServerForServiceWorker
      },
      _restartPromise: null,
      _forceOptimizeOnRestart: false,
      _shortcutsState: options.previousShortcutsState,
    }

    // maintain consistency with the server instance after restarting.
    const reflexServer = new Proxy(server, {
      get: (_, property: keyof ViteDevServerForServiceWorker) => {
        return server[property]
      },
      set: (_, property: keyof ViteDevServerForServiceWorker, value: never) => {
        server[property] = value
        return true
      },
    })

    // TODO: setup for HMR, watchers ...
    // ...

    if (!middlewareMode) {
      httpServer.once('listening', () => {
        // NOTE(kazupon): commented out, because Service Worker server don't need port
        serverConfig.port = 0
        // update actual port since this may be different from initial value
        // serverConfig.port = (httpServer.address() as net.AddressInfo).port
      })
    }

    // Pre applied internal middlewares ------------------------------------------

    // request timer
    if (import.meta.env.DEBUG) {
      middlewares.use(timeMiddleware(root))
    }

    // TODO(kazupon): disable middlewares, after implementing them
    // middlewares.use(rejectInvalidRequestMiddleware())
    // middlewares.use(rejectNoCorsRequestMiddleware())

    // // cors
    // const { cors } = serverConfig
    // if (cors !== false) {
    //   middlewares.use(corsMiddleware(typeof cors === 'boolean' ? {} : cors))
    // }

    // // host check (to prevent DNS rebinding attacks)
    // const { allowedHosts } = serverConfig
    // // no need to check for HTTPS as HTTPS is not vulnerable to DNS rebinding attacks
    // if (allowedHosts !== true && !serverConfig.https) {
    //   middlewares.use(hostValidationMiddleware(allowedHosts, false))
    // }

    // apply configureServer hooks ------------------------------------------------

    const configureServerContext = new BasicMinimalPluginContext(
      { ...basePluginContextMeta, watchMode: true },
      config.logger,
    )
    const postHooks: ((() => void) | void)[] = []
    for (const hook of config.getSortedPluginHooks('configureServer')) {
      postHooks.push(await hook.call(configureServerContext, reflexServer as unknown as ViteDevServer))
    }

    // Internal middlewares ------------------------------------------------------

    // NOTE(kazupon): commented out, until implementing transform middleware
    // if (!config.experimental.bundledDev) {
    //   middlewares.use(cachedTransformMiddleware(server))
    // }
    //
    // // proxy
    // const { proxy } = serverConfig
    // if (proxy) {
    //   const middlewareServer =
    //     (isObject(middlewareMode) ? middlewareMode.server : null) || httpServer
    //   middlewares.use(proxyMiddleware(middlewareServer, proxy, config))
    // }

    // base
    if (config.base !== '/') {
      middlewares.use(baseMiddleware(config.rawBase, !!middlewareMode))
    }

    // NOTE(kazupon): commented out, until implementing other middlewares
    // // open in editor support
    // middlewares.use('/__open-in-editor', launchEditorMiddleware())
    //
    // // ping request handler
    // // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
    // middlewares.use(function viteHMRPingMiddleware(req, res, next) {
    //   if (req.headers['accept'] === 'text/x-vite-ping') {
    //     res.writeHead(204).end()
    //   } else {
    //     next()
    //   }
    // })

    // serve static files under /public
    // this applies before the transform middleware so that these files are served
    // as-is without transforms.
    if (publicDir) {
      middlewares.use(servePublicMiddleware(server, publicFiles))
    }

    if (config.experimental.bundledDev) {
      // TODO: implement memoryFilesMiddleware later
      // middlewares.use(memoryFilesMiddleware(server))
    } else {
      // main transform middleware
      middlewares.use('*', transformMiddleware(server))
      // console.log('[SW] transformMiddleware applied', transformMiddleware)

      // serve static files
      middlewares.use(serveRawFsMiddleware(server))
      middlewares.use(serveStaticMiddleware(server))
    }

    // Register custom hono middlewares
    for (const middleware of customMiddlewares) {
      middlewares.use(middleware)
    }

    // html fallback
    if (config.appType === 'spa' || config.appType === 'mpa') {
      middlewares.use(
        htmlFallbackMiddleware(
          root,
          config.appType === 'spa',
        ),
      )
    }

    // apply configureServer post hooks ------------------------------------------

    // This is applied before the html middleware so that user middleware can
    // serve custom content instead of index.html.
    postHooks.forEach((fn) => fn && fn())

    if (config.appType === 'spa' || config.appType === 'mpa') {
      // transform index.html
      middlewares.use(indexHtmlMiddleware(root, server))

      // handle 404s
      middlewares.use(notFoundMiddleware())
    }

    // error handler
    middlewares.onError(errorMiddleware(server, false))

    // httpServer.listen can be called multiple times
    // when port when using next port number
    // this code is to avoid calling buildStart multiple times
    let initingServer: Promise<void> | undefined
    let serverInited = false
    const initServer = async (onListen: boolean) => {
      if (serverInited) {
        return
      }
      if (initingServer) {
        return initingServer
      }

      initingServer = (async function () {
        await startServer(
          server,
          {
            enableListenConnections: true,
            port: onListen ? serverConfig.port : -1
          }
        )
        initingServer = undefined
        serverInited = true
      })()
      return initingServer
    }

    try {
      await initServer(!middlewareMode)
    } catch (err) {
      httpServer.emit('error', err as Error)
    }

    // Listen for V_WW_CONNECT_PORT connections from Main Thread.
    // When a MessagePort for Web Worker communication arrives,
    // perform the V_WW_SW_CHANNEL_READY handshake, then create
    // a birpc RPC client for delegating transform requests to the WW.
    httpServer.on('connection', (event) => {
      if (event.data?.type !== 'V_WW_CONNECT_PORT' || !event.ports[0]) {
        return
      }

      const port = event.ports[0]
      const clientId = event.clientId
      debug?.('Worker port received via connection event')

      // Phase 1: Handshake — wait for WW's channel-ready before creating birpc
      port.onmessage = async (e: MessageEvent<WebWorkerServiceWorkerChannelReadyMessage>) => {
        if (e.data.type === 'V_WW_SW_CHANNEL_READY' && e.data.source === 'ww') {
          // Reply with SW's channel-ready
          port.postMessage({ type: 'V_WW_SW_CHANNEL_READY', source: 'sw' })

          // Notify the originating client that the connection is established
          if (clientId) {
            const client = await serviceWorkerScope.clients.get(clientId)
            client?.postMessage({ type: 'V_WW_CONNECT_PORT_ACK' })
          }

          // Phase 2: Replace onmessage with birpc
          workerRpc = createBirpc<WorkerFunctions, ServiceWorkerFunctions>(
            {
              // ServiceWorkerFunctions handlers (currently empty, future: HMR relay etc.)
            },
            {
              post: rpcData => port.postMessage(rpcData),
              on: fn => { port.onmessage = (ev: MessageEvent) => fn(ev.data) },
              timeout: 30_000,
            }
          )

          debug?.('Worker RPC established via birpc')
        }
      }
    })

    return server
  }

  return Object.freeze({
    middlewares: customMiddlewares,
    listen
  })
}

async function startServer(
  server: ViteDevServerForServiceWorker,
  options?: ListenOptions & { port?: number },
): Promise<void> {
  const httpServer = server.httpServer
  server._configServerPort = options?.port

  const startHttp = new Promise<number>((resolve, reject) => {
    const onError = (e: Error & { code?: string }) => {
      httpServer.off('error', onError)
      reject(e)
    }
    httpServer.on('error', onError)

    httpServer.listen(options)
    httpServer.off('error', onError)
    resolve(0)
  })

  const serverPort = await startHttp
  server._currentServerPort = serverPort
  server._currentServerPort = serverPort
}

export function createServerCloseFn(
  server: HttpServer | null,
): () => Promise<void> {
  if (!server) {
    return () => Promise.resolve()
  }

  let hasListened = false
  server.once('listening', () => {
    hasListened = true
  })

  return () =>
    new Promise<void>((resolve, reject) => {
      if (hasListened) {
        server.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
}


// === Middleware utils ===
export { getRequestPath } from './server/middlewares/utils'

// === Config ===
export { defineConfig, resolveConfig, sortUserPlugins } from './config'
export type {
  AppType,
  ConfigEnv,
  DevEnvironmentOptions,
  EnvironmentOptions,
  ExperimentalOptions,
  HTMLOptions,
  InlineConfig,
  LegacyOptions,
  PluginHookUtils, ResolveFn, ResolvedConfig,
  ResolvedDevEnvironmentOptions,
  ResolvedEnvironmentOptions,
  ResolvedWorkerOptions, UserConfig,
  UserConfigExport,
  UserConfigFn,
  UserConfigFnObject,
  UserConfigFnPromise
} from './config'

// === HMR types & relay ===
export {
  createServerHotChannel,
  getShortName,
  normalizeHotChannel
} from './server/hmr'
export type {
  HmrContext,
  HmrOptions,
  HotChannel,
  HotChannelClient,
  HotChannelListener,
  HotUpdateOptions,
  NormalizedHotChannel,
  NormalizedHotChannelClient,
  NormalizedServerHotChannel,
  ServerHotChannel,
  ServerHotChannelApi
} from './server/hmr'

// === MessageChannel HMR server ===
export {
  createMessageChannelServer,
  isMessageChannelServer
} from './server/ws'
export type {
  MessageChannelClient,
  MessageChannelCustomListener,
  MessageChannelServer
} from './server/ws'

// === HMR payload types ===
export type {
  CustomEventMap,
  InferCustomEventPayload,
  InvalidatePayload
} from '#types/customEvent'
export type {
  ConnectedPayload,
  CustomPayload,
  ErrorPayload,
  FullReloadPayload,
  HMRPayload,
  HotPayload,
  PrunePayload,
  Update,
  UpdatePayload
} from '#types/hmrPayload'

// === Types only (interop with Worker) ===
export type { Environment } from './environment'
export type {
  DepOptimizationConfig,
  DepOptimizationMetadata,
  DepOptimizationOptions,
  ExportsData,
  OptimizedDepInfo
} from './optimizer'
export type { DevEnvironment, DevEnvironmentContext } from './server/environment'
export type {
  EnvironmentModuleGraph,
  EnvironmentModuleNode,
  ResolvedUrl
} from './server/moduleGraph'
export type { TransformOptions, TransformResult } from './server/transformRequest'

// === Backward compatibility ===
export { ModuleGraph } from './server/mixedModuleGraph'
export type { ModuleNode } from './server/mixedModuleGraph'

// === Logger ===
export { createLogger } from './logger'
export type { LogLevel, LogType, Logger } from './logger'

// === Dep types ===
export type {
  Alias,
  AliasOptions,
  MapToFunction,
  ResolverFunction,
  ResolverObject
} from '#dep-types/alias'
export type { Hono } from 'hono'

// === Protocol message types & constants ===
export {
  V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_WW_SW_CHANNEL_READY
} from '../shared/messages'
export type {
  ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage, WebWorkerServiceWorkerChannelReadyMessage
} from '../shared/messages'

