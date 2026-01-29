// ...

import type { InlineConfig, ResolvedConfig } from '../config'
import {
  httpServerStart,
} from '../http'

// ..

import type { SourceMap } from 'rolldown'
import type { ModuleRunner } from 'vite/module-runner'

import type { FSWatcher, WatchOptions } from '#dep-types/chokidar'

import type { CommonServerOptions } from '../http'

import {
  createDebugger
} from '../utils'

import type { BindCLIShortcutsOptions, ShortcutsState } from '../shortcuts'

import type { RequiredExceptFor } from '../typeUtils'

import type { ModuleNode } from './mixedModuleGraph'

import type { TransformOptions, TransformResult } from './transformRequest'

import type { DevEnvironment } from './environment'

// ...

import type { HmrOptions } from './hmr'
import type { MessageChannelServer } from './ws'

import { createMessageChannelServer } from './ws'

// TODO: fill in code later ...

import { baseMiddleware } from './middlewares/base'
import { timeMiddleware } from './middlewares/time'
import { transformMiddleware } from './middlewares/transform'

// TODO: fill in code later ...

import { createSvcWorkerServer } from '@vrowser/service-worker-server'
import { Hono } from 'hono'
import { handle } from 'hono/service-worker'

import type { SvcWorkerServer } from '@vrowser/service-worker-server'
import type { BlankSchema, Env } from 'hono/types'

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
    // TODO: enable later if needed
    // | 'proxy'
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

// TODO: enable later ...
// export type ServerHook = (
//   this: MinimalPluginContextWithoutEnvironment,
//   server: ViteDevServer,
// ) => (() => void) | void | Promise<(() => void) | void>

export type HttpServer = SvcWorkerServer

/**
 * Minimal Vite Dev Server interface for Service Worker environment
 */
export interface ViteDevServer {
  /**
   * The resolved vite config object
   */
  config: ResolvedConfig
  /**
   * A Hono app instance.
   * - Can be used to attach custom middlewares to the dev server.
   * - Can also be used as the handler function in Service Worker's fetch event
   * - Compatible with Web Standard Request/Response API
   *
   * @example Middleware mode usage
   * ```ts
   * const server = createServer(self, { server: { middlewareMode: true } })
   *
   * // Add custom middleware before default handlers
   * server.middlewares.get('/__preview__/*', (c) => {
   *   return c.text('Preview content')
   * })
   *
   * // Start listening for fetch events
   * server.listen()
   * ```
   */
  middlewares: Hono<ViteEnv, BlankSchema, '/'>
  /**
   * native Node http server instance
   * will be null in middleware mode
   */
  // httpServer: HttpServer | null
  httpServer: HttpServer
  /**
   * Promise that resolves when the server is fully initialized.
   *
   * The fetch event handler is registered immediately (synchronously) when
   * createServer is called with { listen: true }. However, some functionality
   * like transformRequest, module resolution, and plugin hooks require
   * waiting for this promise to resolve.
   *
   * @example
   * ```ts
   * const server = createServer(sw, config, { listen: true })
   * // fetch event is already registered here
   *
   * sw.addEventListener('activate', (event) => {
   *   event.waitUntil((async () => {
   *     await server.ready
   *     await sw.clients.claim()
   *   })())
   * })
   * ```
   */
  ready: Promise<void>
  /**
   * Chokidar watcher instance. If `config.server.watch` is set to `null`,
   * it will not watch any files and calling `add` or `unwatch` will have no effect.
   * https://github.com/paulmillr/chokidar/tree/3.6.0#api
   */
  watcher: FSWatcher
  /**
   * The MessageChannel server that sends HMR payloads to the client.
   * This is the Service Worker equivalent of WebSocket server in standard Vite.
   */
  ws: MessageChannelServer
  // TODO: fill in later ...
  // ...
  /**
   * Module execution environments attached to the Vite server.
   */
  environments: Record<'client' | 'ssr' | (string & {}), DevEnvironment>
  /**
   * Module graph that tracks the import relationships, url to file mapping
   * and hmr state.
   */
  // TODO: enable later ...
  // moduleGraph: ModuleGraph
  /**
   * The resolved urls Vite prints on the CLI (URL-encoded). Returns `null`
   * in middleware mode or if the server is not listening on any port.
   */
  resolvedUrls: ResolvedServerUrls | null
  /**
    * Programmatically resolve, load and transform a URL and get the result
    * without going through the http request pipeline.
    */
  transformRequest(
    url: string,
    options?: TransformOptions,
  ): Promise<TransformResult | null>
  /**
   * Same as `transformRequest` but only warm up the URLs so the next request
   * will already be cached. The function will never throw as it handles and
   * reports errors internally.
   */
  warmupRequest(url: string, options?: TransformOptions): Promise<void>
  /**
   * Apply vite built-in HTML transforms and any plugin HTML transforms.
   */
  transformIndexHtml(
    url: string,
    html: string,
    originalUrl?: string,
  ): Promise<string>
  /**
   * Transform module code into SSR format.
   */
  ssrTransform(
    code: string,
    inMap: SourceMap | { mappings: '' } | null,
    url: string,
    originalCode?: string,
  ): Promise<TransformResult | null>
  /**
   * Load a given URL as an instantiated module for SSR.
   */
  ssrLoadModule(
    url: string,
    opts?: { fixStacktrace?: boolean },
  ): Promise<Record<string, any>>
  /**
   * Returns a fixed version of the given stack
   */
  ssrRewriteStacktrace(stack: string): string
  /**
   * Mutates the given SSR error by rewriting the stacktrace
   */
  ssrFixStacktrace(e: Error): void
  /**
   * Triggers HMR for a module in the module graph. You can use the `server.moduleGraph`
   * API to retrieve the module to be reloaded. If `hmr` is false, this is a no-op.
   */
  reloadModule(module: ModuleNode): Promise<void>
  /**
   * Start the server.
   */
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
  /**
   * Stop the server.
   */
  close(): Promise<void>
  /**
   * Print server urls
   */
  printUrls(): void
  /**
   * Bind CLI shortcuts
   */
  bindCLIShortcuts(options?: BindCLIShortcutsOptions<ViteDevServer>): void
  /**
   * Restart the server.
   *
   * @param forceOptimize - force the optimizer to re-bundle, same as --force cli flag
   */
  restart(forceOptimize?: boolean): Promise<void>
  /**
   * Open browser
   */
  openBrowser(): void
  /**
   * Calling `await server.waitForRequestsIdle(id)` will wait until all static imports
   * are processed. If called from a load or transform plugin hook, the id needs to be
   * passed as a parameter to avoid deadlocks. Calling this function after the first
   * static imports section of the module graph has been processed will resolve immediately.
   */
  waitForRequestsIdle: (ignoredId?: string) => Promise<void>
  /**
   * @internal
   */
  _setInternalServer(server: ViteDevServer): void
  /**
   * @internal
   */
  _restartPromise: Promise<void> | null
  /**
   * @internal
   */
  _forceOptimizeOnRestart: boolean
  /**
   * @internal
   */
  _shortcutsState?: ShortcutsState<ViteDevServer>
  /**
   * @internal
   */
  _currentServerPort?: number | undefined
  /**
   * @internal
   */
  _configServerPort?: number | undefined
  /**
   * @internal
   */
  _ssrCompatModuleRunner?: ModuleRunner
}

export interface ResolvedServerUrls {
  local: string[]
  network: string[]
}

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
): ViteDevServer {
  // TOOD: implement for config resolving and etc ...
  // ...
  const config = inlineConfig as ResolvedConfig
  console.log('[SW] Vite Dev Server config:', config)

  // TODO: ...

  const { root, server: serverConfig } = config
  const { middlewareMode } = serverConfig

  // TODO: ...

  const basePath = options.basePath || '/'
  const middlewares = new Hono<ViteEnv, BlankSchema, '/'>().basePath(basePath)
  const httpServer = createSvcWorkerServer(serviceWorkerScope, {
    version: options.version ?? '0.0.0',
    claimOnActivate: !middlewareMode, // if middlewareMode is enabled, do not claim on activate
    debug: createDebugger('vrowser:svc-worker-server')!,
  })
  const fetchHandler = handle(middlewares)

  // NOTE(kazupon): first implementation for service worker dev server
  // middlewares.get('/hello', (c) => {
  //   console.log(`[Hono] Fetch event for ${c.req.url}`)
  //   return c.text('Vite Dev Server on Service Worker says hello!')
  // })

  // TODO: ...

  // Backward compatibility

  // let moduleGraph = new ModuleGraph({
  //   client: () => environments.client.moduleGraph,
  //   ssr: () => environments.ssr.moduleGraph,
  // })
  // let pluginContainer = createPluginContainer(environments)

  const closeHttpServer = createServerCloseFn(httpServer)

  // Create MessageChannel server for HMR
  const ws = createMessageChannelServer(httpServer, config)

  // const devHtmlTransformFn = createDevHtmlTransformFn(config)

  // Ready promise for async initialization
  let readyResolve: () => void
  let readyReject: (err: Error) => void
  const readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })

  // Promise used by `server.close()` to ensure `closeServer()` is only called once
  let closeServerPromise: Promise<void> | undefined
  const closeServer = async () => {
    // if (!middlewareMode) {
    //   teardownSIGTERMListener(closeServerAndExit)
    // }

    await Promise.allSettled([
      // watcher.close(),
      ws.close(),
      // Promise.allSettled(
      //   Object.values(server.environments).map((environment) =>
      //     environment.close(),
      //   ),
      // ),
      closeHttpServer(),
      // server._ssrCompatModuleRunner?.close(),
    ])
    server.resolvedUrls = null
    server._ssrCompatModuleRunner = undefined
  }

  // let hot = ws
  let server: ViteDevServer = {
    config,
    middlewares,
    httpServer,
    ws,
    ready: readyPromise,
    // watcher,
    // get hot() {
    //   warnFutureDeprecation(config, 'removeServerHot')
    //   return hot
    // },
    // set hot(h) {
    //   hot = h
    // },

    // environments,
    // get pluginContainer() {
    //   warnFutureDeprecation(config, 'removeServerPluginContainer')
    //   return pluginContainer
    // },
    // set pluginContainer(p) {
    //   pluginContainer = p
    // },
    // get moduleGraph() {
    //   warnFutureDeprecation(config, 'removeServerModuleGraph')
    //   return moduleGraph
    // },
    // set moduleGraph(graph) {
    //   moduleGraph = graph
    // },

    resolvedUrls: null, // will be set on listen
    // ssrTransform(
    //   code: string,
    //   inMap: SourceMap | { mappings: '' } | null,
    //   url: string,
    //   originalCode = code,
    // ) {
    //   return ssrTransform(code, inMap, url, originalCode, {
    //     json: {
    //       stringify:
    //         config.json.stringify === true && config.json.namedExports !== true,
    //     },
    //   })
    // },
    // transformRequest(url, options) {
    //   warnFutureDeprecation(config, 'removeServerTransformRequest')
    //   const environment = server.environments[options?.ssr ? 'ssr' : 'client']
    //   return environment.transformRequest(url)
    // },
    // warmupRequest(url, options) {
    //   warnFutureDeprecation(config, 'removeServerWarmupRequest')
    //   const environment = server.environments[options?.ssr ? 'ssr' : 'client']
    //   return environment.warmupRequest(url)
    // },
    // transformIndexHtml(url, html, originalUrl) {
    //   return devHtmlTransformFn(server, url, html, originalUrl)
    // },
    // async ssrLoadModule(url, opts?: { fixStacktrace?: boolean }) {
    //   warnFutureDeprecation(config, 'removeSsrLoadModule')
    //   return ssrLoadModule(url, server, opts?.fixStacktrace)
    // },
    // ssrFixStacktrace(e) {
    //   warnFutureDeprecation(
    //     config,
    //     'removeSsrLoadModule',
    //     "ssrFixStacktrace doesn't need to be used for Environment Module Runners.",
    //   )
    //   ssrFixStacktrace(e, server.environments.ssr.moduleGraph)
    // },
    // ssrRewriteStacktrace(stack: string) {
    //   warnFutureDeprecation(
    //     config,
    //     'removeSsrLoadModule',
    //     "ssrRewriteStacktrace doesn't need to be used for Environment Module Runners.",
    //   )
    //   return ssrRewriteStacktrace(stack, server.environments.ssr.moduleGraph)
    //     .result
    // },
    // async reloadModule(module) {
    //   warnFutureDeprecation(config, 'removeServerReloadModule')
    //   if (serverConfig.hmr !== false && module.file) {
    //     // TODO: Should we also update the node moduleGraph for backward compatibility?
    //     const environmentModule = (module._clientModule ?? module._ssrModule)!
    //     updateModules(
    //       environments[environmentModule.environment]!,
    //       module.file,
    //       [environmentModule],
    //       monotonicDateNow(),
    //     )
    //   }
    // },
    async listen(port: number = -1, isRestart: boolean = false) {
      // async listen(port?: number, isRestart?: boolean) {
      // const hostname = await resolveHostname(config.server.host)
      // if (httpServer) {
      //   httpServer.prependListener('listening', () => {
      //     server.resolvedUrls = resolveServerUrls(
      //       httpServer,
      //       config.server,
      //       hostname,
      //       httpsOptions,
      //       config,
      //     )
      //   })
      // }
      // await startServer(server, hostname, port)
      await startServer(server, fetchHandler, port)
      if (httpServer) {
        if (!isRestart && config.server.open) server.openBrowser()
      }
      return server
    },
    openBrowser() {
      console.warn('[@vrowser/vite-dev-server] not supported: server.openBrowser()')
      // NOTE(kazupon): commented out, because Service Worker server don't need to open browser
      // const options = server.config.server
      // const url = getServerUrlByHost(server.resolvedUrls, options.host)
      // if (url) {
      //   const path =
      //     typeof options.open === 'string'
      //       ? new URL(options.open, url).href
      //       : url

      //   // We know the url that the browser would be opened to, so we can
      //   // start the request while we are awaiting the browser. This will
      //   // start the crawling of static imports ~500ms before.
      //   // preTransformRequests needs to be enabled for this optimization.
      //   if (server.config.server.preTransformRequests) {
      //     setTimeout(() => {
      //       const getMethod = path.startsWith('https:') ? httpsGet : httpGet

      //       getMethod(
      //         path,
      //         {
      //           headers: {
      //             // Allow the history middleware to redirect to /index.html
      //             Accept: 'text/html',
      //           },
      //         },
      //         (res) => {
      //           res.on('end', () => {
      //             // Ignore response, scripts discovered while processing the entry
      //             // will be preprocessed (server.config.server.preTransformRequests)
      //           })
      //         },
      //       )
      //         .on('error', () => {
      //           // Ignore errors
      //         })
      //         .end()
      //     }, 0)
      //   }

      //   _openBrowser(path, true, server.config.logger)
      // } else {
      //   server.config.logger.warn('No URL available to open in browser')
      // }
    },
    async close() {
      if (!closeServerPromise) {
        closeServerPromise = closeServer()
      }
      return closeServerPromise
    },
    // printUrls() {
    //   if (server.resolvedUrls) {
    //     printServerUrls(
    //       server.resolvedUrls,
    //       serverConfig.host,
    //       config.logger.info,
    //     )
    //   } else if (middlewareMode) {
    //     throw new Error('cannot print server URLs in middleware mode.')
    //   } else {
    //     throw new Error(
    //       'cannot print server URLs before server.listen is called.',
    //     )
    //   }
    // },
    // bindCLIShortcuts(options) {
    //   bindCLIShortcuts(server, options)
    // },
    // async restart(forceOptimize?: boolean) {
    //   if (!server._restartPromise) {
    //     server._forceOptimizeOnRestart = !!forceOptimize
    //     server._restartPromise = restartServer(server).finally(() => {
    //       server._restartPromise = null
    //       server._forceOptimizeOnRestart = false
    //     })
    //   }
    //   return server._restartPromise
    // },

    // waitForRequestsIdle(ignoredId?: string): Promise<void> {
    //   return environments.client.waitForRequestsIdle(ignoredId)
    // },

    _setInternalServer(_server: ViteDevServer) {
      // Rebind internal the server variable so functions reference the user
      // server instance after a restart
      server = _server
    },
    _restartPromise: null,
    _forceOptimizeOnRestart: false,
    _shortcutsState: options.previousShortcutsState,
  }

  // maintain consistency with the server instance after restarting.
  // const reflexServer = new Proxy(server, {
  //   get: (_, property: keyof ViteDevServer) => {
  //     return server[property]
  //   },
  //   set: (_, property: keyof ViteDevServer, value: never) => {
  //     server[property] = value
  //     return true
  //   },
  // })

  // TODO: setup for HMR, watchers ...
  // ...

  if (!middlewareMode && httpServer) {
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

  // apply configureServer hooks ------------------------------------------------

  // TODO: setup for configureServer hooks

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
  //
  // // serve static files under /public
  // // this applies before the transform middleware so that these files are served
  // // as-is without transforms.
  // if (publicDir) {
  //   middlewares.use(servePublicMiddleware(server, publicFiles))
  // }
  //
  // if (config.experimental.bundledDev) {
  //   middlewares.use(memoryFilesMiddleware(server))
  // } else {
  //   // main transform middleware
  //   middlewares.use(transformMiddleware(server))
  //
  //   // serve static files
  //   middlewares.use(serveRawFsMiddleware(server))
  //   middlewares.use(serveStaticMiddleware(server))
  // }
  //
  // // html fallback
  // if (config.appType === 'spa' || config.appType === 'mpa') {
  //   middlewares.use(
  //     htmlFallbackMiddleware(
  //       root,
  //       config.appType === 'spa',
  //       server.environments.client,
  //     ),
  //   )
  // }

  if (config.experimental.bundledDev) {
    // TODO: implement memoryFilesMiddleware later
  } else {
    // main transform middleware
    // middlewares.use('*', transformMiddleware(server))
    console.log('[SW] transformMiddleware applied', transformMiddleware)
  }

  // apply configureServer post hooks ------------------------------------------

  // TODO: setup for configureServer hooks

  // httpServer.listen can be called multiple times
  // when port when using next port number
  // this code is to avoid calling buildStart multiple times
  let initingServer: Promise<void> | undefined
  let serverInited = false
  const initServer = async (onListen: boolean) => {
    if (serverInited) return
    if (initingServer) return initingServer

    initingServer = (async function () {
      // if (!config.experimental.bundledDev) {
      //   // For backward compatibility, we call buildStart for the client
      //   // environment when initing the server. For other environments
      //   // buildStart will be called when the first request is transformed
      //   await environments.client.pluginContainer.buildStart()
      // }

      // // ensure ws server started
      // if (onListen || options.listen) {
      //   await Promise.all(
      //     Object.values(environments).map((e) => e.listen(server)),
      //   )
      // }

      initingServer = undefined
      serverInited = true
    })()
    return initingServer
  }

  // If `options.listen` is `true`, register fetch event handler immediately (synchronously)
  // This is critical for Service Workers which require fetch listeners during script evaluation
  // In `middlewareMode`, user should call `server.listen()` manually to register fetch handler
  if (options.listen && !middlewareMode) {
    httpServer.listen(fetchHandler)
  }

  // overwrite listen to init optimizer before server start
  const originalListen = httpServer.listen.bind(httpServer)
  httpServer.listen = ((_port: number, ...args: any[]) => {
    // Register fetch handler synchronously first for Service Worker compatibility
    originalListen(fetchHandler, ...args)

      // Run async initialization in background
      // oxlint-disable-next-line @typescript-eslint/no-floating-promises
      ; (async () => {
        try {
          await initServer(true)
        } catch (e) {
          httpServer.emit('error', e as Error)
        }
      })()
  }) as any

    // Run async initialization in background and resolve ready promise when done
    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    ; (async () => {
      try {
        await initServer(options.listen ?? false)
        readyResolve!()
      } catch (err) {
        readyReject!(err as Error)
      }
    })()

  return server
}

// ...

async function startServer(
  server: ViteDevServer,
  handler: (event: FetchEvent) => void, // NOTE(kazupon): for Service Worker fetch event handling
  // NOTE(kazupon): the below options are not needed in Service Worker server
  // hostname: Hostname,
  inlinePort?: number,
): Promise<void> {
  const httpServer = server.httpServer

  // NOTE(kazupon): commented out, because Service Worker server don't need the port
  // const options = server.config.server
  // const configPort = inlinePort ?? options.port
  // // When using non strict port for the dev server, the running port can be different from the config one.
  // // When restarting, the original port may be available but to avoid a switch of URL for the running
  // // browser tabs, we enforce the previously used port, expect if the config port changed.
  // const port =
  //   (!configPort || configPort === server._configServerPort
  //     ? server._currentServerPort
  //     : configPort) ?? DEFAULT_DEV_PORT
  // server._configServerPort = configPort
  server._configServerPort = inlinePort

  // NOTE(kazupon): commented out, because Service Worker server need the custom handler
  // const serverPort = await httpServerStart(httpServer, {
  //   port,
  //   strictPort: options.strictPort,
  //   host: hostname.host,
  //   logger: server.config.logger,
  // })
  const serverPort = await httpServerStart(httpServer, handler)
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
  // const openSockets = new Set<net.Socket>()

  // server.on('connection', (socket) => {
  //   openSockets.add(socket)
  //   socket.on('close', () => {
  //     openSockets.delete(socket)
  //   })
  // })

  server.once('listening', () => {
    hasListened = true
  })

  return () =>
    new Promise<void>((resolve, reject) => {
      // TODO: destroy HMR connections too ?
      // openSockets.forEach((s) => s.destroy())
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
