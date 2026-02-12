/**
 * Not Found Hono middleware
 * This middleware is ported from vite's notFound middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/notFound.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */


import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

export function notFoundMiddleware(): MiddlewareHandler<ViteEnv> {
  return async function vite404Middleware(c) {
    console.log('[not-found] vite404Middleware called for:', c.req.url)
    return c.body(null, 404)
  }
}
