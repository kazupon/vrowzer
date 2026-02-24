/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Context } from 'hono'
import type { ViteEnv } from '../index'

/**
 * Get the request path including query string, accounting for base URL stripping by baseMiddleware.
 *
 * IMPORTANT: All subsequent middlewares MUST use this utility function to get the request path
 * instead of accessing `c.req.path` directly. This ensures that the path returned is correctly
 * stripped of the base URL prefix when baseMiddleware has processed the request.
 *
 * Unlike Hono's `c.req.path` (which excludes query string), this function includes
 * the query string (e.g. `?import`, `?t=123`). This is critical for Vite's middleware
 * pipeline which uses query parameters like `?import` to identify module requests.
 *
 * When baseMiddleware strips the base URL from the path (e.g., `/app/page` → `/page`),
 * it stores the rewritten path in `c.var.rewrittenUrl`. This function returns that
 * rewritten path if available, otherwise constructs the path with query string from
 * the original request URL.
 *
 * @param c - The Hono context object
 * @returns The request path with query string and base URL stripped (if applicable)
 *
 * @example
 * ```ts
 * middlewares.use('*', async (c, next) => {
 *   // CORRECT: Use getRequestPath to get the base-stripped path with query
 *   const path = getRequestPath(c)  // '/page?import' (if base was '/app')
 *
 *   // WRONG: Do not use c.req.path directly in middlewares after baseMiddleware
 *   // const path = c.req.path  // '/app/page' (original, no query, not stripped)
 * })
 * ```
 */
export function getRequestPath(c: Context<ViteEnv>): string {
  const rewritten = c.get('rewrittenUrl')
  if (rewritten) {
    return rewritten
  }
  // Include query string (c.req.path excludes it, but Vite needs ?import, ?t=xxx etc.)
  const url = new URL(c.req.url)
  return url.pathname + url.search
}
