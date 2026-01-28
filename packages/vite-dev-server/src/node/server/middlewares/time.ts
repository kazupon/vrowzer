/**
 * Time measurement middleware for Hono
 * This middleware is ported from vite's time middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/time.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createDebugger, prettifyUrl, timeFrom } from '../../utils'

import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

const logTime = createDebugger('vite:time')

/**
 * Time measurement middleware for Hono
 * Logs request processing time when `DEBUG` includes 'vite:time'
 */
export function timeMiddleware(root: string): MiddlewareHandler<ViteEnv> {
  return async function viteTimeMiddleware(c, next) {
    const start = performance.now()

    await next()

    if (logTime) {
      const url = c.req.url
      logTime(`${timeFrom(start)} ${prettifyUrl(url, root)}`)
    }
  }
}
