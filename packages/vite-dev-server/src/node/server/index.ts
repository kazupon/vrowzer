// ...

import type { InlineConfig, ResolvedConfig } from '../config'

// ..

import type { DevEnvironment } from './environment'

import type { BindCLIShortcutsOptions, ShortcutsState } from '../shortcuts'

// ...

import type { Hono } from 'hono'
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

  // TODO: fill in later
}


export function createServer(
  inlineConfig: InlineConfig | ResolvedConfig = {},
): Promise<ViteDevServer> {
  return _createServer(inlineConfig, { listen: true })
}

export async function _createServer(
  inlineConfig: ResolvedConfig | InlineConfig | undefined = {},
  options: {
    listen: boolean
    previousEnvironments?: Record<string, DevEnvironment>
    previousShortcutsState?: ShortcutsState<ViteDevServer>
  },
): Promise<ViteDevServer> {
  // TODO: implement the server creation logic!
  return {} as Promise<ViteDevServer>
}
