// ...

import type { InlineConfig, ResolvedConfig } from '../config'

// ..

import type { DevEnvironment } from './environment'

import type { BindCLIShortcutsOptions, ShortcutsState } from '../shortcuts'

// ...

import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import type { SvcWorker } from '@vrowser/service-worker/worker'
import type { Env, BlankSchema } from 'hono/types'

/**
 * Environment type for Vite Dev Server running in Service Worker
 */
export interface ViteEnv extends Env {
  // Bindings available throughout the request lifecycle
  Bindings: {}
  // Variables set during request processing
  Variables: {}
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
  // TODO: fill in later ...
  // ...
  /**
   * Stop the server.
   */
  close(): Promise<void>
  /**
   * Print server urls
   */
  // TODO: fill in later ...
  // ...
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
