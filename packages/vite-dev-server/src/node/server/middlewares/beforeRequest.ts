/**
 * Before request Hono middleware
 *
 * Lets the owner of the Service Worker dev server hold a request until it can be served,
 * or answer it instead.
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

/**
 * Middleware that waits for `beforeRequest` before the request is handled.
 * When the hook resolves to a `Response`, that response is returned instead.
 */
export function beforeRequestMiddleware(
  beforeRequest: (request: Request) => Promise<Response | undefined>,
): MiddlewareHandler<ViteEnv> {
  return async function viteBeforeRequestMiddleware(c, next) {
    const response = await beforeRequest(c.req.raw)
    if (response) {
      // A response returned as it is would lose the headers that earlier middlewares set,
      // such as the cross-origin isolation headers, so rebuild it through the context
      return c.newResponse(response.body, response)
    }
    await next()
  }
}
