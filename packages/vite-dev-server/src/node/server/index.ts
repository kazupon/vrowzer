import type { FSWatcher, WatchOptions } from '#dep-types/chokidar'
import type { ListenOptions, SvcWorkerServer } from '@vrowser/service-worker-server'
import { createSvcWorkerServer } from '@vrowser/service-worker-server'
import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import type { BlankSchema, Env, MiddlewareHandler } from 'hono/types'
import path from 'node:path'
import colors from 'picocolors'
import type { SourceMap } from 'rolldown'
import type { ModuleRunner } from 'vite/module-runner'
import type { InlineConfig, ResolvedConfig } from '../config'
import { isResolvedConfig, resolveConfig } from '../config'
import { initPublicFiles } from '../publicDir'
import {
  createNoopWatcher,
  getResolvedOutDirs,
  resolveChokidarOptions,
  resolveEmptyOutDir,
} from '../watch'
import { searchForWorkspaceRoot } from './searchRoot'
// NOTE(kazupon): disable now
// import {
//   DEFAULT_DEV_PORT,
//   defaultAllowedOrigins
// } from '../constants'
import {
  CLIENT_DIR
} from '../constants'
import { warnFutureDeprecation } from '../deprecations'
import type { CommonServerOptions } from '../http'
import {
  httpServerStart,
} from '../http'
import type { Logger } from '../logger'
import type { MinimalPluginContextWithoutEnvironment } from '../plugin'
import type { BindCLIShortcutsOptions, ShortcutsState } from '../shortcuts'
import type { RequiredExceptFor } from '../typeUtils'
import {
  createDebugger,
  isInNodeModules,
  isParentDirectory,
  mergeWithDefaults,
  normalizePath
} from '../utils'
import type { DevEnvironment } from './environment'
import type { HmrOptions, NormalizedHotChannel } from './hmr'
import { baseMiddleware } from './middlewares/base'
import { errorMiddleware } from './middlewares/error'
import { htmlFallbackMiddleware } from './middlewares/htmlFallback'
import {
  createDevHtmlTransformFn,
  indexHtmlMiddleware
} from './middlewares/indexHtml'
import { notFoundMiddleware } from './middlewares/notFound'
import { servePublicMiddleware, serveRawFsMiddleware, serveStaticMiddleware } from './middlewares/static'
import { timeMiddleware } from './middlewares/time'
import { transformMiddleware } from './middlewares/transform'
import type { ModuleNode } from './mixedModuleGraph'
import { ModuleGraph } from './mixedModuleGraph'
// NOTE(kazupon): `./options` importing for avoid circular dependency
import { serverConfigDefaults as _serverConfigDefaults } from './options'
import type { PluginContainer } from './pluginContainer'
import {
  BasicMinimalPluginContext,
  basePluginContextMeta,
  createPluginContainer,
} from './pluginContainer'
import type { TransformOptions, TransformResult } from './transformRequest'
import type { MessageChannelServer } from './ws'
import { createMessageChannelServer } from './ws'

export * from './middlewares/utils'

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

export type HttpServer = SvcWorkerServer

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
  listen(): Promise<Omit<ViteDevServer, 'listen'>>
}

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
   */
  middlewares: Hono<ViteEnv, BlankSchema, '/'>
  /**
   * native Node http server instance
   * will be null in middleware mode
   */
  // httpServer: HttpServer | null
  httpServer: HttpServer
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
  /**
   * An alias to `server.environments.client.hot`.
   * If you want to interact with all environments, loop over `server.environments`.
   */
  hot: NormalizedHotChannel
  /**
   * Rollup plugin container that can run plugin hooks on a given file
   */
  pluginContainer: PluginContainer
  /**
   * Module execution environments attached to the Vite server.
   */
  environments: Record<'client' | 'ssr' | (string & {}), DevEnvironment>
  /**
   * Module graph that tracks the import relationships, url to file mapping
   * and hmr state.
   */
  moduleGraph: ModuleGraph
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
  const httpServer = createSvcWorkerServer(serviceWorkerScope, {
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
  async function listen(): Promise<ViteDevServer> {
    const config = isResolvedConfig(inlineConfig)
      ? inlineConfig
      : await resolveConfig(inlineConfig, 'serve')
    console.log('[vrowser-vite-dev-server] Vite Dev Server config:', config)

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

    // Create MessageChannel server for HMR
    const ws = createMessageChannelServer(httpServer, config)

    const publicFiles = await initPublicFilesPromise
    const { publicDir } = config
    console.log('[vrowser-vite-dev-server] publicDir:', publicDir, 'publicFiles:', publicFiles)

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

    const environments: Record<string, DevEnvironment> = {}
    await Promise.all(
      Object.entries(config.environments).map(
        async ([name, environmentOptions]) => {
          const environment = await environmentOptions.dev.createEnvironment(
            name,
            config,
            {
              ws,
            },
          )
          environments[name] = environment

          const previousInstance =
            options.previousEnvironments?.[environment.name]
          await environment.init({ watcher, previousInstance })
        },
      ),
    )
    console.log('[vrowser-vite-dev-server] Created environments:', environments)

    // Backward compatibility

    let moduleGraph = new ModuleGraph({
      client: () => environments.client.moduleGraph,
      ssr: () => environments.ssr.moduleGraph,
    })
    let pluginContainer = createPluginContainer(environments)

    const closeHttpServer = createServerCloseFn(httpServer)

    const devHtmlTransformFn = createDevHtmlTransformFn(config)

    // Promise used by `server.close()` to ensure `closeServer()` is only called once
    let closeServerPromise: Promise<void> | undefined
    const closeServer = async () => {
      // if (!middlewareMode) {
      //   teardownSIGTERMListener(closeServerAndExit)
      // }

      await Promise.allSettled([
        // watcher.close(),
        ws.close(),
        Promise.allSettled(
          Object.values(server.environments).map((environment) =>
            environment.close(),
          ),
        ),
        closeHttpServer(),
        server._ssrCompatModuleRunner?.close(),
      ])
      server.resolvedUrls = null
      server._ssrCompatModuleRunner = undefined
    }

    let hot = ws
    let server: ViteDevServer = {
      config,
      middlewares,
      httpServer,
      ws,
      // watcher,
      get hot() {
        warnFutureDeprecation(config, 'removeServerHot')
        return hot
      },
      set hot(h) {
        hot = h
      },

      environments,
      get pluginContainer() {
        warnFutureDeprecation(config, 'removeServerPluginContainer')
        return pluginContainer
      },
      set pluginContainer(p) {
        pluginContainer = p
      },
      get moduleGraph() {
        warnFutureDeprecation(config, 'removeServerModuleGraph')
        return moduleGraph
      },
      set moduleGraph(graph) {
        moduleGraph = graph
      },

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
      warmupRequest(url, options) {
        warnFutureDeprecation(config, 'removeServerWarmupRequest')
        const environment = server.environments[options?.ssr ? 'ssr' : 'client']
        return environment.warmupRequest(url)
      },
      transformIndexHtml(url, html, originalUrl) {
        return devHtmlTransformFn(server, url, html, originalUrl)
      },
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
      // async listen(port?: number, isRestart?: boolean) {
      //   const hostname = await resolveHostname(config.server.host)
      //   if (httpServer) {
      //     httpServer.prependListener('listening', () => {
      //       server.resolvedUrls = resolveServerUrls(
      //         httpServer,
      //         config.server,
      //         hostname,
      //         httpsOptions,
      //         config,
      //       )
      //     })
      //   }
      //   await startServer(server, hostname, port)
      //   if (httpServer) {
      //     if (!isRestart && config.server.open) server.openBrowser()
      //   }
      //   return server
      // },
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
    const reflexServer = new Proxy(server, {
      get: (_, property: keyof ViteDevServer) => {
        return server[property]
      },
      set: (_, property: keyof ViteDevServer, value: never) => {
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
      postHooks.push(await hook.call(configureServerContext, reflexServer))
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
          server.environments.client,
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
      if (serverInited) {return}
      if (initingServer) {return initingServer}

      initingServer = (async function () {
        await startServer(
          server,
          {
            enableListenConnections: true,
            port: onListen ? serverConfig.port : -1
          }
        )
        // if (!config.experimental.bundledDev) {
        //   // For backward compatibility, we call buildStart for the client
        //   // environment when initing the server. For other environments
        //   // buildStart will be called when the first request is transformed
        //   await environments.client.pluginContainer.buildStart()
        // }

        // ensure ws server started
        if (onListen || options.listen) {
          await Promise.all(
            Object.values(environments).map((e) => e.listen(server)),
          )
        }

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

    return server
  }

  return Object.freeze({
    middlewares: customMiddlewares,
    listen
  })
}

// TODO: fill in code ...

async function startServer(
  server: ViteDevServer,
  options?: ListenOptions & { port?: number },
  // NOTE(kazupon): the below options are not needed in Service Worker server
  // hostname: Hostname,
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
  server._configServerPort = options?.port

  // NOTE(kazupon): commented out, because Service Worker server need the custom handler
  // const serverPort = await httpServerStart(httpServer, {
  //   port,
  //   strictPort: options.strictPort,
  //   host: hostname.host,
  //   logger: server.config.logger,
  // })
  // NOTE: setFetchHandler() is already called in createServer()
  const serverPort = await httpServerStart(httpServer, options)
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

// TODO: fill in code ...

function resolvedAllowDir(root: string, dir: string): string {
  return normalizePath(path.resolve(root, dir))
}

// NOTE(kazupon): commented out, until implementing default server config
// const _serverConfigDefaults = Object.freeze({
//   port: DEFAULT_DEV_PORT,
//   strictPort: false,
//   host: 'localhost',
//   allowedHosts: [],
//   https: undefined,
//   open: false,
//   proxy: undefined,
//   cors: { origin: defaultAllowedOrigins },
//   headers: {},
//   // hmr
//   // ws
//   warmup: {
//     clientFiles: [],
//     ssrFiles: [],
//   },
//   // watch
//   middlewareMode: false,
//   fs: {
//     strict: true,
//     // allow
//     deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**'],
//   },
//   // origin
//   preTransformRequests: true,
//   // sourcemapIgnoreList
//   perEnvironmentStartEndDuringDev: false,
//   perEnvironmentWatchChangeDuringDev: false,
//   // hotUpdateEnvironments
// } satisfies ServerOptions)
// export const serverConfigDefaults: Readonly<Partial<ServerOptions>> =
//   _serverConfigDefaults
//

export function resolveServerOptions(
  root: string,
  raw: ServerOptions | undefined,
  logger: Logger,
): ResolvedServerOptions {
  const _server = mergeWithDefaults(
    {
      ..._serverConfigDefaults,
      host: undefined, // do not set here to detect whether host is set or not
      sourcemapIgnoreList: isInNodeModules,
    },
    raw ?? {},
  )

  const server: ResolvedServerOptions = {
    ..._server,
    fs: {
      ..._server.fs,
      // run searchForWorkspaceRoot only if needed
      allow: raw?.fs?.allow ?? [searchForWorkspaceRoot(root)],
    },
    sourcemapIgnoreList:
      _server.sourcemapIgnoreList === false
        ? () => false
        : _server.sourcemapIgnoreList,
  }

  let allowDirs = server.fs.allow

  // NOTE(kazupon): disable, because Yarn PnP is not supported in Service Worker server
  // if (process.versions.pnp) {
  //   // running a command fails if cwd doesn't exist and root may not exist
  //   // search for package root to find a path that exists
  //   const cwd = searchForPackageRoot(root)
  //   try {
  //     const enableGlobalCache =
  //       execSync('yarn config get enableGlobalCache', { cwd })
  //         .toString()
  //         .trim() === 'true'
  //     const yarnCacheDir = execSync(
  //       `yarn config get ${enableGlobalCache ? 'globalFolder' : 'cacheFolder'}`,
  //       { cwd },
  //     )
  //       .toString()
  //       .trim()
  //     allowDirs.push(yarnCacheDir)
  //   } catch (e) {
  //     logger.warn(`Get yarn cache dir error: ${e.message}`, {
  //       timestamp: true,
  //     })
  //   }
  // }

  allowDirs = allowDirs.map((i) => resolvedAllowDir(root, i))

  // only push client dir when vite itself is outside-of-root
  const resolvedClientDir = resolvedAllowDir(root, CLIENT_DIR)
  if (!allowDirs.some((dir) => isParentDirectory(dir, resolvedClientDir))) {
    allowDirs.push(resolvedClientDir)
  }

  server.fs.allow = allowDirs

  if (server.origin?.endsWith('/')) {
    server.origin = server.origin.slice(0, -1)
    logger.warn(
      colors.yellow(
        `${colors.bold('(!)')} server.origin should not end with "/". Using "${server.origin
        }" instead.`,
      ),
    )
  }

  if (
    import.meta.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS &&
    // NOTE(kazupon): use 'import.meta.env' directly, because process.env is not available in SW
    // process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS &&
    Array.isArray(server.allowedHosts)
  ) {
    const additionalHost = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
    server.allowedHosts = [...server.allowedHosts, additionalHost]
  }

  return server
}
