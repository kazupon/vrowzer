// ...

import type { InlineConfig, ResolvedConfig } from '../config'

// ..

import type { SourceMap } from 'rolldown'
import type { ModuleRunner } from 'vite/module-runner'

import type { FSWatcher, WatchOptions } from '#dep-types/chokidar'

import type { CommonServerOptions } from '../http'

import type { BindCLIShortcutsOptions, ShortcutsState } from '../shortcuts'

import type { RequiredExceptFor } from '../typeUtils'

import type { ModuleNode } from './mixedModuleGraph'

import type { TransformOptions, TransformResult } from './transformRequest'

import type { DevEnvironment } from './environment'

// ...

import type { HmrOptions } from './hmr'

// ...

import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import type { SvcWorkerServer, SvcWorkerServerOptions } from '@vrowser/service-worker-server'
import type { SvcWorker } from '@vrowser/service-worker/worker'
import type { Env, BlankSchema } from 'hono/types'

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
  Variables: {}
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
   * @example
   * ```ts
   * // Add custom middleware
   * server.middlewares.use('/api', async (c, next) => {
   *   await next()
   *   c.header('X-Custom', 'value')
   * })
   *
   * // Use in Service Worker fetch event
   * self.addEventListener('fetch', (event) => {
   *   event.respondWith(server.middlewares.fetch(event.request))
   * })
   * ```
   */
  middlewares: Hono<ViteEnv, BlankSchema, '/'>
  /**
   * native Node http server instance
   * will be null in middleware mode
   */
  httpServer: HttpServer | null
  /**
   * Chokidar watcher instance. If `config.server.watch` is set to `null`,
   * it will not watch any files and calling `add` or `unwatch` will have no effect.
   * https://github.com/paulmillr/chokidar/tree/3.6.0#api
   */
  watcher: FSWatcher
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

export async function createServer(
  serviceWorker: SvcWorker,
  inlineConfig: InlineConfig | ResolvedConfig = {},
  options: {
    listen: boolean
    previousEnvironments?: Record<string, DevEnvironment>
    previousShortcutsState?: ShortcutsState<ViteDevServer>
  },
): Promise<ViteDevServer> {
  // TOOD: implement for config resolving and etc ...
  // ...
  const config = inlineConfig as ResolvedConfig

  // TODO: ...

  const { root, server: serverConfig } = config

  // TODO: ...

  const middlewares = new Hono<ViteEnv, BlankSchema, '/'>()

  // TODO: ...

  // Backward compatibility

  // let moduleGraph = new ModuleGraph({
  //   client: () => environments.client.moduleGraph,
  //   ssr: () => environments.ssr.moduleGraph,
  // })
  // let pluginContainer = createPluginContainer(environments)

  const closeHttpServer = createServerCloseFn(serviceWorker)

  // const devHtmlTransformFn = createDevHtmlTransformFn(config)

  // Promise used by `server.close()` to ensure `closeServer()` is only called once
  let closeServerPromise: Promise<void> | undefined
  const closeServer = async () => {
    // if (!middlewareMode) {
    //   teardownSIGTERMListener(closeServerAndExit)
    // }

    await Promise.allSettled([
      // watcher.close(),
      // ws.close(),
      // Promise.allSettled(
      //   Object.values(server.environments).map((environment) =>
      //     environment.close(),
      //   ),
      // ),
      closeHttpServer(),
      // server._ssrCompatModuleRunner?.close(),
    ])
    // server.resolvedUrls = null
    // server._ssrCompatModuleRunner = undefined
  }

  // let hot = ws
  let server: ViteDevServer = {
    config,
    middlewares,
    async close() {
      if (!closeServerPromise) {
        closeServerPromise = closeServer()
      }
      return closeServerPromise
    },
  }

  // TODO: setup for HMR, watchers ...
  // ...

  // Pre applied internal middlewares ------------------------------------------

  // TODO: setup internal middlewares

  // apply configureServer post hooks ------------------------------------------

  // TODO: setup for configureServer hooks

  return server
}

// ...

export function createServerCloseFn(
  serviceWorker: SvcWorker,
): () => Promise<void> {
  // TODO: we need to manage hrm connections here too ?

  // let hasListened = false
  // const openSockets = new Set<net.Socket>()

  // server.on('connection', (socket) => {
  //   openSockets.add(socket)
  //   socket.on('close', () => {
  //     openSockets.delete(socket)
  //   })
  // })

  // server.once('listening', () => {
  //   hasListened = true
  // })

  return () =>
    new Promise<void>((resolve, reject) => {
      // TODO: destroy HMR connections too ?
      // openSockets.forEach((s) => s.destroy())
      // if (hasListened) {
      //   server.close((err) => {
      //     if (err) {
      //       reject(err)
      //     } else {
      //       resolve()
      //     }
      //   })
      // } else {
      //   resolve()
      // }
    })
}
