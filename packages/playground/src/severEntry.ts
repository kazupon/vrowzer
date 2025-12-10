import { isResolvedConfig, resolveConfig } from './config.ts'
import { createWindowMessageServer } from './message.ts'
import { ModuleGraph } from './mixedModuleGraph.ts'
import { createPluginContainer } from './pluginContainer.ts'
import { createBrowserdar } from './watcher.ts'

import type { SourceMap } from '@rolldown/browser'
import type {
  DevEnvironment,
  FSWatcher,
  InlineConfig,
  ResolvedConfig,
  ViteDevServer,
  WebSocketServer
} from 'vite'

export async function createServer(
  inlineConfig: InlineConfig | ResolvedConfig = {},
  options: {
    listen?: boolean
    previousEnvironments?: Record<string, DevEnvironment>
    // previousShortcutsState?: ShortcutsState<ViteDevServer>
  } = {}
): Promise<ViteDevServer> {
  const config = isResolvedConfig(inlineConfig)
    ? inlineConfig
    : await resolveConfig(inlineConfig, 'serve')
  console.log('[Server] Resolved config:', config)

  options.listen = options.listen ?? true

  // TODO(kazupon): fix type
  const watcher = createBrowserdar({}) as unknown as FSWatcher
  // NOTE(kazupon): unfortunately, vite types will force `WebSocketServer` type at `CreateDevEnvironmentContext.ws`
  const ws = createWindowMessageServer(config) as unknown as WebSocketServer

  const environments: Record<string, DevEnvironment> = {}

  // Initialize environments
  await Promise.all(
    Object.entries(config.environments).map(async ([name, environmentOptions]) => {
      const environment = await environmentOptions.dev.createEnvironment(name, config, { ws })
      environments[name] = environment
      const previousInstance = options.previousEnvironments?.[environment.name]
      await environment.init({ watcher, previousInstance })
    })
  )

  let moduleGraph = new ModuleGraph({
    // @ts-expect-error -- FIXME: types
    client: () => environments.client.moduleGraph,
    // @ts-expect-error -- FIXME: types
    ssr: () => environments.ssr.moduleGraph
  })

  let pluginContainer = createPluginContainer(environments)

  let hot = ws
  let server: ViteDevServer = {
    config,
    watcher,
    ws,

    get hot() {
      // warnFutureDeprecation(config, 'removeServerHot')
      return hot
    },
    set hot(h) {
      hot = h
    },

    environments,

    // @ts-expect-error -- FIXME: types
    get pluginContainer() {
      // warnFutureDeprecation(config, 'removeServerPluginContainer')
      return pluginContainer
    },
    // @ts-expect-error -- FIXME: types
    set pluginContainer(p) {
      pluginContainer = p
    },

    // @ts-expect-error -- FIXME: types
    get moduleGraph() {
      // warnFutureDeprecation(config, 'removeServerModuleGraph')
      return moduleGraph
    },
    // @ts-expect-error -- FIXME: types
    set moduleGraph(graph) {
      moduleGraph = graph
    },

    resolvedUrls: null, // will be set on listen

    ssrTransform(
      code: string,
      inMap: SourceMap | { mappings: '' } | null,
      url: string,
      originalCode = code
    ) {
      return Promise.resolve({
        code,
        map: inMap
      })
      // TODO:
      // return ssrTransform(code, inMap, url, originalCode, {
      //   json: {
      //     stringify:
      //       config.json.stringify === true && config.json.namedExports !== true,
      //   },
      // })
    },
    transformRequest(url, options) {
      // warnFutureDeprecation(config, 'removeServerTransformRequest')
      const environment = server.environments[options?.ssr ? 'ssr' : 'client']
      return environment.transformRequest(url)
    },
    warmupRequest(url, options) {
      // warnFutureDeprecation(config, 'removeServerWarmupRequest')
      const environment = server.environments[options?.ssr ? 'ssr' : 'client']
      return environment.warmupRequest(url)
    },
    transformIndexHtml(url, html, originalUrl) {
      // TODO:
      // return devHtmlTransformFn(server, url, html, originalUrl)
      return Promise.resolve(html)
    },
    async ssrLoadModule(url, opts?: { fixStacktrace?: boolean }) {
      // warnFutureDeprecation(config, 'removeSsrLoadModule')
      // return ssrLoadModule(url, server, opts?.fixStacktrace)
      // TODO:
      return Promise.resolve({} as Record<string, any>)
    },
    ssrFixStacktrace(e) {
      // warnFutureDeprecation(
      //   config,
      //   'removeSsrLoadModule',
      //   "ssrFixStacktrace doesn't need to be used for Environment Module Runners.",
      // )
      // ssrFixStacktrace(e, server.environments.ssr.moduleGraph)
      // TODO:
    },
    ssrRewriteStacktrace(stack: string) {
      // warnFutureDeprecation(
      //   config,
      //   'removeSsrLoadModule',
      //   "ssrRewriteStacktrace doesn't need to be used for Environment Module Runners.",
      // )
      // return ssrRewriteStacktrace(stack, server.environments.ssr.moduleGraph)
      // TODO:
      return stack
    },
    async reloadModule(module) {
      // TODO:
      // warnFutureDeprecation(config, 'removeServerReloadModule')
      // if (serverConfig.hmr !== false && module.file) {
      //   // TODO: Should we also update the node moduleGraph for backward compatibility?
      //   const environmentModule = (module._clientModule ?? module._ssrModule)!
      //   updateModules(
      //     environments[environmentModule.environment]!,
      //     module.file,
      //     [environmentModule],
      //     monotonicDateNow(),
      //   )
      // }
    },
    async listen(port?: number, isRestart?: boolean) {
      return Promise.resolve(server)
      // TODO:
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
      // if (httpServer) {
      //   if (!isRestart && config.server.open) server.openBrowser()
      // }
      // return server
    },
    openBrowser() {
      // TODO:
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
      // TODO:
      // if (!closeServerPromise) {
      //   closeServerPromise = closeServer()
      // }
      // return closeServerPromise
    },
    printUrls() {
      // TODO:
      // if (server.resolvedUrls) {
      //   printServerUrls(
      //     server.resolvedUrls,
      //     serverConfig.host,
      //     config.logger.info,
      //   )
      // } else if (middlewareMode) {
      //   throw new Error('cannot print server URLs in middleware mode.')
      // } else {
      //   throw new Error(
      //     'cannot print server URLs before server.listen is called.',
      //   )
      // }
    },
    bindCLIShortcuts(options) {
      // bindCLIShortcuts(server, options)
    },
    restart(forceOptimize?: boolean) {
      // TODO:
      // if (!server._restartPromise) {
      //   server._forceOptimizeOnRestart = !!forceOptimize
      //   server._restartPromise = restartServer(server).finally(() => {
      //     server._restartPromise = null
      //     server._forceOptimizeOnRestart = false
      //   })
      // }
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- NOTE:
      return server._restartPromise
    },

    waitForRequestsIdle(ignoredId?: string): Promise<void> {
      if (environments.client) {
        return environments.client.waitForRequestsIdle(ignoredId)
      }
      {
        return Promise.resolve()
      }
    },

    _setInternalServer(_server: ViteDevServer) {
      // Rebind internal the server variable so functions reference the user
      // server instance after a restart
      server = _server
    },
    _restartPromise: null,
    _forceOptimizeOnRestart: false
    // _shortcutsState: options.previousShortcutsState,
  }

  return server
}
