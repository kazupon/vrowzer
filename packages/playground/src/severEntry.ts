import { isResolvedConfig, resolveConfig } from './config.ts'
import { warnFutureDeprecation } from './deprecations.ts'
import { createWindowMessageDevServer } from './messages/dev.ts'
import { ModuleGraph } from './mixedModuleGraph.ts'
import {
  basePluginContextMeta,
  BasicMinimalPluginContext,
  createPluginContainer
} from './pluginContainer.ts'
import { initPublicFiles } from './publicDir.ts'
import { mergeConfig, normalizePath } from './utils.ts'
import { createNoopWatcher } from './watch.ts'
import { createWindowMessageHmrServer } from './wm.ts'

import type { SourceMap } from '@rolldown/browser'
import type { DevEnvironment, FSWatcher, InlineConfig, ResolvedConfig, ViteDevServer } from 'vite'
import type { Rolldown, RolldownBinding } from './bundler.ts'
import type { WindowMessageDevServer } from './messages/dev.ts'

export async function createServer(
  inlineConfig: InlineConfig | ResolvedConfig = {},
  rolldown: Rolldown,
  binding: RolldownBinding,
  hmrPort: MessagePort,
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
  console.log(`[Server] Using rolldown version: `, rolldown, binding)

  options.listen = options.listen ?? true

  const initPublicFilesPromise = initPublicFiles(config)

  const { root, server: serverConfig } = config

  const watchEnabled = serverConfig.watch !== null
  const watcher = watchEnabled
    ? // @ts-expect-error -- FIXME: types
      (new binding.__fs.FSWatcher() as FSWatcher)
    : createNoopWatcher({})
  console.log('[Server] Starting FSWatcher...', watcher)
  // watcher.start('.')
  // watcher.on('change', (path: string) => {
  //   console.log(`[FSWatcher] File changed --->: ${path}`)
  // })
  // setInterval(() => {
  //   console.log('[Server] Writing test file to virtual FS')
  //   binding.__fs.appendFileSync('/main.ts', 'test')
  //   console.log('[Server] File written.', binding.__volume.toJSON())
  // }, 1000)
  // const watcher = createBrowserdar({}) as unknown as FSWatcher

  const devMessageServer = createWindowMessageDevServer(self)
  devMessageServer.listen()
  devMessageServer.on('bundle', async message => {
    console.log('[DevMessageServer] Bundle message received:', message)
  })

  // NOTE(kazupon): unfortunately, vite types will force `WebSocketServer` type at `CreateDevEnvironmentContext.ws`
  const ws = createWindowMessageHmrServer(
    devMessageServer,
    hmrPort,
    config
  ) as unknown as ViteDevServer['ws']

  const publicFiles = await initPublicFilesPromise
  const { publicDir } = config

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

  // @ts-expect-error -- FIXME: types
  let pluginContainer = createPluginContainer(environments)

  const closeHttpServer = createServerCloseFn(devMessageServer)

  // Promise used by `server.close()` to ensure `closeServer()` is only called once
  let closeServerPromise: Promise<void> | undefined
  const closeServer = async () => {
    await Promise.allSettled([
      watcher.close(),
      ws.close(),
      Promise.allSettled(
        Object.values(server.environments).map(environment => environment.close())
      ),
      closeHttpServer(),
      server._ssrCompatModuleRunner?.close()
    ])
    server.resolvedUrls = null
    server._ssrCompatModuleRunner = undefined
  }

  let hot = ws
  let server: ViteDevServer = {
    config,
    devWindowMessageServer: devMessageServer,
    watcher,
    ws,

    get hot() {
      warnFutureDeprecation(config, 'removeServerHot')
      return hot
    },
    set hot(h) {
      hot = h
    },

    environments,

    // @ts-expect-error -- FIXME: types
    get pluginContainer() {
      warnFutureDeprecation(config, 'removeServerPluginContainer')
      return pluginContainer
    },
    // @ts-expect-error -- FIXME: types
    set pluginContainer(p) {
      pluginContainer = p
    },

    // @ts-expect-error -- FIXME: types
    get moduleGraph() {
      warnFutureDeprecation(config, 'removeServerModuleGraph')
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
      warnFutureDeprecation(config, 'removeServerTransformRequest')
      const environment = server.environments[options?.ssr ? 'ssr' : 'client']
      return environment.transformRequest(url)
    },

    warmupRequest(url, options) {
      warnFutureDeprecation(config, 'removeServerWarmupRequest')
      const environment = server.environments[options?.ssr ? 'ssr' : 'client']
      return environment.warmupRequest(url)
    },

    transformIndexHtml(url, html, originalUrl) {
      // TODO:
      // return devHtmlTransformFn(server, url, html, originalUrl)
      return Promise.resolve(html)
    },

    async ssrLoadModule(url, opts?: { fixStacktrace?: boolean }) {
      warnFutureDeprecation(config, 'removeSsrLoadModule')
      // return ssrLoadModule(url, server, opts?.fixStacktrace)
      // TODO:
      return Promise.resolve({} as Record<string, any>)
    },

    ssrFixStacktrace(e) {
      warnFutureDeprecation(
        config,
        'removeSsrLoadModule',
        "ssrFixStacktrace doesn't need to be used for Environment Module Runners."
      )
      // ssrFixStacktrace(e, server.environments.ssr.moduleGraph)
      // TODO:
    },

    ssrRewriteStacktrace(stack: string) {
      warnFutureDeprecation(
        config,
        'removeSsrLoadModule',
        "ssrRewriteStacktrace doesn't need to be used for Environment Module Runners."
      )
      // return ssrRewriteStacktrace(stack, server.environments.ssr.moduleGraph)
      // TODO:
      return stack
    },

    async reloadModule(module) {
      warnFutureDeprecation(config, 'removeServerReloadModule')
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
      await startServer(server)
      return server
    },

    openBrowser() {
      throw new Error('server.openBrowser() is not supported in the browser environment.')
    },

    async close() {
      if (!closeServerPromise) {
        closeServerPromise = closeServer()
      }
      return closeServerPromise
    },

    printUrls() {
      console.log('printUrls called')
    },

    bindCLIShortcuts(options) {
      throw new Error('server.bindCLIShortcuts() is not supported in the browser environment.')
    },

    restart(forceOptimize?: boolean) {
      if (!server._restartPromise) {
        server._forceOptimizeOnRestart = !!forceOptimize
        server._restartPromise = restartServer(server, rolldown, binding, hmrPort).finally(() => {
          server._restartPromise = null
          server._forceOptimizeOnRestart = false
        })
      }
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

  // maintain consistency with the server instance after restarting.
  const reflexServer = new Proxy(server, {
    get: (_, property: keyof ViteDevServer) => {
      return server[property]
    },
    set: (_, property: keyof ViteDevServer, value: never) => {
      server[property] = value
      return true
    }
  })

  const onHMRUpdate = async (type: 'create' | 'delete' | 'update', file: string) => {
    console.log(`[onHMRUpdate] File ${type}d: ${file}`)
    if (serverConfig.hmr !== false) {
      // TODO(kazupon):
      // await handleHMRUpdate(type, file, server)
    }
  }

  const onFileAddUnlink = async (file: string, isUnlink: boolean) => {
    // TODO(kazupon):
    console.log(`[onFileAddUnlink] File ${isUnlink ? 'removed' : 'added'}: ${file}`)

    file = normalizePath(file)
    // NOTE(kazupon): not need to handle tsconfig.json change for browser HMR
    // reloadOnTsconfigChange(server, file)

    await Promise.all(
      Object.values(server.environments).map(environment =>
        environment.pluginContainer.watchChange(file, {
          event: isUnlink ? 'delete' : 'create'
        })
      )
    )

    if (publicDir && publicFiles) {
      if (file.startsWith(publicDir)) {
        const path = file.slice(publicDir.length)
        publicFiles[isUnlink ? 'delete' : 'add'](path)
        if (!isUnlink) {
          const clientModuleGraph = server.environments.client.moduleGraph
          const moduleWithSamePath = await clientModuleGraph.getModuleByUrl(path)
          const etag = moduleWithSamePath?.transformResult?.etag
          if (etag) {
            // The public file should win on the next request over a module with the
            // same path. Prevent the transform etag fast path from serving the module
            clientModuleGraph.etagToModuleMap.delete(etag)
          }
        }
      }
    }

    if (isUnlink) {
      // invalidate module graph cache on file change
      for (const environment of Object.values(server.environments)) {
        environment.moduleGraph.onFileDelete(file)
      }
    }
    await onHMRUpdate(isUnlink ? 'delete' : 'create', file)
  }

  watcher.on('change', async file => {
    file = normalizePath(file)
    // NOTE(kazupon): not need to handle tsconfig.json change for browser HMR
    // reloadOnTsconfigChange(server, file)

    await Promise.all(
      Object.values(server.environments).map(environment =>
        environment.pluginContainer.watchChange(file, { event: 'update' })
      )
    )
    // invalidate module graph cache on file change
    for (const environment of Object.values(server.environments)) {
      environment.moduleGraph.onFileChange(file)
    }
    await onHMRUpdate('update', file)
  })

  watcher.on('add', file => {
    onFileAddUnlink(file, false)
  })
  watcher.on('unlink', file => {
    onFileAddUnlink(file, true)
  })

  // Pre applied internal middlewares ------------------------------------------

  // ---

  // apply configureServer hooks ------------------------------------------------

  const configureServerContext = new BasicMinimalPluginContext(
    { ...basePluginContextMeta, watchMode: true },
    config.logger
  )
  const postHooks: ((() => void) | void)[] = []
  for (const hook of config.getSortedPluginHooks('configureServer')) {
    postHooks.push(await hook.call(configureServerContext, reflexServer))
  }

  // Internal middlewares ------------------------------------------------------

  // ---

  // apply configureServer post hooks ------------------------------------------

  // This is applied before the html middleware so that user middleware can
  // serve custom content instead of index.html.
  postHooks.forEach(fn => fn && fn())

  // NOTE(kazupon): we might not need to init the optimizer here ...
  // httpServer.listen can be called multiple times
  // when port when using next port number
  // this code is to avoid calling buildStart multiple times
  let initingServer: Promise<void> | undefined
  let serverInited = false
  const initServer = async (onListen: boolean) => {
    if (serverInited) return
    if (initingServer) return initingServer

    initingServer = (async function () {
      // For backward compatibility, we call buildStart for the client
      // environment when initing the server. For other environments
      // buildStart will be called when the first request is transformed
      // @ts-expect-error -- FIXME(kazupon): types
      await environments.client.pluginContainer.buildStart()

      // ensure ws server started
      if (onListen || options.listen) {
        await Promise.all(Object.values(environments).map(e => e.listen(server)))
      }

      initingServer = undefined
      serverInited = true
    })()
    return initingServer
  }

  if (devMessageServer) {
    // overwrite listen to init optimizer before server start
    const listen = devMessageServer.listen.bind(devMessageServer)
    devMessageServer.listen = (async (port: number, ...args: any[]) => {
      try {
        await initServer(true)
      } catch (e) {
        devMessageServer.emit('error', e)
        return
      }
      // @ts-expect-error -- FIXME(kazupon): types
      return listen(port, ...args)
    }) as any
  } else {
    await initServer(false)
  }

  return server
}

// ---

async function startServer(server: ViteDevServer): Promise<void> {
  const devWindowMessageServer = server.devWindowMessageServer
  if (!devWindowMessageServer) {
    throw new Error('Cannot call server.listen.')
  }

  server.listen()
}

function createServerCloseFn(server: WindowMessageDevServer | null): () => Promise<void> {
  if (!server) {
    return () => Promise.resolve()
  }

  return () =>
    new Promise<void>(resolve => {
      server.close()
      resolve()
    })
}

// ---

async function restartServer(
  server: ViteDevServer,
  rolldown: Rolldown,
  binding: RolldownBinding,
  hmrPort: MessagePort
): Promise<void> {
  global.__vite_start_time = performance.now()

  let inlineConfig = server.config.inlineConfig
  if (server._forceOptimizeOnRestart) {
    inlineConfig = mergeConfig(inlineConfig, {
      forceOptimizeDeps: true
    })
  }

  // Reinit the server by creating a new instance using the same inlineConfig
  // This will trigger a reload of the config file and re-create the plugins and
  // middlewares. We then assign all properties of the new server to the existing
  // server instance and set the user instance to be used in the new server.
  // This allows us to keep the same server instance for the user.
  {
    let newServer: ViteDevServer | null = null
    try {
      // delay ws server listen
      newServer = await createServer(inlineConfig, rolldown, binding, hmrPort, {
        listen: false,
        previousEnvironments: server.environments
      })
    } catch (err: any) {
      server.config.logger.error(err.message, {
        timestamp: true
      })
      server.config.logger.error('server restart failed', { timestamp: true })
      return
    }

    // Detach readline so close handler skips it. Reused to avoid stdin issues
    // server._shortcutsState = undefined

    await server.close()

    // // Assign new server props to existing server instance
    // const middlewares = server.middlewares
    // newServer._configServerPort = server._configServerPort
    // newServer._currentServerPort = server._currentServerPort
    // Object.assign(server, newServer)

    // // Keep the same connect instance so app.use(vite.middlewares) works
    // // after a restart in middlewareMode (.route is always '/')
    // middlewares.stack = newServer.middlewares.stack
    // server.middlewares = middlewares

    // Rebind internal server variable so functions reference the user server
    newServer._setInternalServer(server)
  }

  const {
    logger,
    server: { port, middlewareMode }
  } = server.config
  if (!middlewareMode) {
    await server.listen(port, true)
  } else {
    await Promise.all(Object.values(server.environments).map(e => e.listen(server)))
  }
  logger.info('server restarted.', { timestamp: true })

  // if (
  //   (server._shortcutsState as ShortcutsState<ViteDevServer> | undefined)
  //     ?.options
  // ) {
  //   bindCLIShortcuts(
  //     server,
  //     { print: false },
  //     // Skip environment checks since shortcuts were bound before restart
  //     true,
  //   )
  // }
}

/**
 * Internal function to restart the Vite server and print URLs if changed
 */
export async function restartServerWithUrls(server: ViteDevServer): Promise<void> {
  if (server.config.server.middlewareMode) {
    await server.restart()
    return
  }

  // const { port: prevPort, host: prevHost } = server.config.server
  // const prevUrls = server.resolvedUrls

  await server.restart()

  const {
    logger
    // server: { port, host },
  } = server.config
  logger.info('')
  server.printUrls()
  // if (
  //   (port ?? DEFAULT_DEV_PORT) !== (prevPort ?? DEFAULT_DEV_PORT) ||
  //   host !== prevHost ||
  //   diffDnsOrderChange(prevUrls, server.resolvedUrls)
  // ) {
  //   logger.info('')
  //   server.printUrls()
  // }
}
