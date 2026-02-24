/**
 * Base URL Hono middleware
 * This middleware is ported from vite's base middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/base.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { cleanUrl, withTrailingSlash } from '../../../shared/utils'
import { joinUrlSegments, stripBase } from '../../utils'

import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

/**
 * Base URL middleware for Hono
 * This middleware is only active when (`base !== '/'`)
 *
 * IMPORTANT: This middleware stores the base-stripped URL in `c.var.rewrittenUrl`.
 * All subsequent middlewares MUST use `getRequestPath(c)` `from './utils'` to get
 * the request path instead of accessing `c.req.path` directly.
 *
 * @see {@link ./utils#getRequestPath}
 */
export function baseMiddleware(
  rawBase: string,
  middlewareMode: boolean
): MiddlewareHandler<ViteEnv> {
  return async function viteBaseMiddleware(c, next) {
    console.log('[base] viteBaseMiddleware called for:', c.req.url)

    // Include query string — Vite's middleware pipeline needs ?import, ?t=xxx etc.
    const parsedUrl = new URL(c.req.url)
    const url = parsedUrl.pathname + parsedUrl.search
    const pathname = cleanUrl(url)
    const base = rawBase

    if (pathname.startsWith(base)) {
      // Rewrite URL to remove base
      const rewrittenUrl = stripBase(url, base)
      c.set('rewrittenUrl', rewrittenUrl)
      return next()
    }

    // Skip redirect and error fallback on middleware mode
    if (middlewareMode) {
      return next()
    }

    if (pathname === '/' || pathname === '/index.html') {
      // Redirect root visit to based URL with search and hash
      return c.redirect(base + url.slice(pathname.length), 302)
    }

    // Non-based page visit
    const redirectPath =
      withTrailingSlash(url) !== base ? joinUrlSegments(base, url) : base

    if (c.req.header('accept')?.includes('text/html')) {
      return c.html(
        `The server is configured with a public base URL of ${base} - ` +
        `did you mean to visit <a href="${redirectPath}">${redirectPath}</a> instead?`,
        404
      )
    } else {
      return c.text(
        `The server is configured with a public base URL of ${base} - ` +
        `did you mean to visit ${redirectPath} instead?`,
        404
      )
    }
  }
}
