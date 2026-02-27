/**
 * Cross-origin isolation Hono middleware
 *
 * Sets CORP/COEP/COOP headers required for credentialless iframe + Service Worker
 * to work together. The main page sets COEP: credentialless, so all Service Worker served
 * responses must include these headers.
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

/**
 * Cross-origin isolation middleware for Hono
 *
 * Adds Cross-Origin-Resource-Policy, Cross-Origin-Embedder-Policy,
 * and Cross-Origin-Opener-Policy headers to all responses.
 */
export function crossOriginMiddleware(): MiddlewareHandler<ViteEnv> {
  return async function viteCrossOriginMiddleware(c, next) {
    c.header('Cross-Origin-Resource-Policy', 'same-origin')
    c.header('Cross-Origin-Embedder-Policy', 'require-corp')
    c.header('Cross-Origin-Opener-Policy', 'same-origin')
    await next()
  }
}
