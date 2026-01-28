/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Context } from 'hono'
import type { ViteEnv } from '../index'

/**
 * Get the request path, accounting for base URL stripping by baseMiddleware.
 *
 * IMPORTANT: All subsequent middlewares MUST use this utility function to get the request path
 * instead of accessing `c.req.path` directly. This ensures that the path returned is correctly
 * stripped of the base URL prefix when baseMiddleware has processed the request.
 *
 * When baseMiddleware strips the base URL from the path (e.g., `/app/page` → `/page`),
 * it stores the rewritten path in `c.var.rewrittenUrl`. This function returns that
 * rewritten path if available, otherwise falls back to the original `c.req.path`.
 *
 * @param c - The Hono context object
 * @returns The request path with base URL stripped (if applicable)
 *
 * @example
 * ```ts
 * middlewares.use('*', async (c, next) => {
 *   // CORRECT: Use getRequestPath to get the base-stripped path
 *   const path = getRequestPath(c)  // '/page' (if base was '/app')
 *
 *   // WRONG: Do not use c.req.path directly in middlewares after baseMiddleware
 *   // const path = c.req.path  // '/app/page' (original, not stripped)
 * })
 * ```
 */
export function getRequestPath(c: Context<ViteEnv>): string {
  return c.get('rewrittenUrl') ?? c.req.path
}
