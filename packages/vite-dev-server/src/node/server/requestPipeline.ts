/**
 * The Vite middlewares of the Web Worker
 *
 * The Service Worker forwards each request within the base path to the Web Worker, which has the
 * project files, the module graph and the plugins. The Web Worker answers the request with the
 * middlewares that Vite's dev server registers in `_createServer()`, in the same order.
 *
 * @module node/server/requestPipeline
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Hono } from 'hono'
import { deserializeRequest, serializeResponse } from '../../shared/requestTransport'
import { baseMiddleware } from './middlewares/base'
import { errorMiddleware } from './middlewares/error'
import { htmlFallbackMiddleware } from './middlewares/htmlFallback'
import { indexHtmlMiddleware } from './middlewares/indexHtml'
import { notFoundMiddleware } from './middlewares/notFound'
import { servePublicMiddleware, serveRawFsMiddleware, serveStaticMiddleware } from './middlewares/static'
import { transformMiddleware } from './middlewares/transform'

import type { BlankSchema } from 'hono/types'
import type { SerializedRequest, SerializedResponse } from '../../shared/rpc'
import type { ViteDevServer, ViteEnv } from './index'

/**
 * The Vite middlewares of the Web Worker, which answer the requests that the Service Worker
 * forwards.
 */
export interface RequestPipeline {
  /**
   * The app that the middlewares are registered on. Plugins add their middlewares to it in
   * `configureServer`, as `server.middlewares`.
   */
  readonly middlewares: Hono<ViteEnv, BlankSchema, '/'>
  /**
   * Register the internal middlewares, the functions that the `configureServer` hooks returned, and
   * the error handler. Call it once, after the `configureServer` hooks.
   *
   * @param server - The dev server whose requests the middlewares answer
   * @param publicFiles - The files in the public directory, which the watcher keeps up to date
   * @param postHooks - The functions that the `configureServer` hooks returned
   */
  applyInternalMiddlewares(
    server: ViteDevServer,
    publicFiles: Set<string> | undefined,
    postHooks: ((() => void) | void)[],
  ): void
  /**
   * Answer a request that the Service Worker forwarded.
   */
  handleRequest(request: SerializedRequest): Promise<SerializedResponse>
}

/**
 * Create the Vite middlewares of the Web Worker.
 *
 * @param basePath - The base path of the requests that the Service Worker forwards, e.g. `/__preview__`
 */
export function createRequestPipeline(basePath = '/'): RequestPipeline {
  let middlewares = new Hono<ViteEnv, BlankSchema, '/'>()
  // `basePath()` returns a clone with its own error handler, so `onError()` is registered on the
  // same app that answers the requests.
  if (basePath !== '/') {
    middlewares = middlewares.basePath(basePath)
  }

  return {
    middlewares,

    applyInternalMiddlewares(server, publicFiles, postHooks) {
      const { config } = server
      const { root, publicDir } = config

      // base
      if (config.base !== '/') {
        middlewares.use(baseMiddleware(config.rawBase, !!config.server.middlewareMode))
      }

      // serve static files under /public
      // this applies before the transform middleware so that these files are served
      // as-is without transforms.
      if (publicDir) {
        middlewares.use(servePublicMiddleware(server, publicFiles))
      }

      // main transform middleware
      middlewares.use('*', transformMiddleware(server))

      // serve static files
      middlewares.use(serveRawFsMiddleware(server))
      middlewares.use(serveStaticMiddleware(server))

      // html fallback
      if (config.appType === 'spa' || config.appType === 'mpa') {
        middlewares.use(htmlFallbackMiddleware(root, config.appType === 'spa'))
      }

      // apply configureServer post hooks
      // This is applied before the html middleware so that user middleware can
      // serve custom content instead of index.html.
      postHooks.forEach((fn) => fn && fn())

      if (config.appType === 'spa' || config.appType === 'mpa') {
        // transform index.html
        middlewares.use(indexHtmlMiddleware(root, server, { isDev: true }))

        // handle 404s
        middlewares.use(notFoundMiddleware())
      }

      // error handler
      middlewares.onError(errorMiddleware(server, false))
    },

    async handleRequest(request) {
      return serializeResponse(await middlewares.fetch(deserializeRequest(request)))
    },
  }
}
