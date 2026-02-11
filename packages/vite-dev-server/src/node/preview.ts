import type { Hono } from 'hono'
import type { BlankSchema } from 'hono/types'
import type { ResolvedConfig } from './config'
import { DEFAULT_PREVIEW_PORT } from './constants'
import type { CommonServerOptions } from './http'
import type { MinimalPluginContextWithoutEnvironment } from './plugin'
import type {
  HttpServer,
  ResolvedServerOptions,
  ResolvedServerUrls,
} from './server'
import type { ViteEnv } from './server/index'
import type { BindCLIShortcutsOptions, ShortcutsState } from './shortcuts'
import type { RequiredExceptFor } from './typeUtils'

// TODO: fill in later ...

export interface PreviewOptions extends CommonServerOptions { }

export interface ResolvedPreviewOptions extends RequiredExceptFor<
  PreviewOptions,
  'host' | 'https' | 'proxy'
> { }

export function resolvePreviewOptions(
  preview: PreviewOptions | undefined,
  server: ResolvedServerOptions,
): ResolvedPreviewOptions {
  // The preview server inherits every CommonServerOption from the `server` config
  // except for the port to enable having both the dev and preview servers running
  // at the same time without extra configuration
  return {
    port: preview?.port ?? DEFAULT_PREVIEW_PORT,
    strictPort: preview?.strictPort ?? server.strictPort,
    host: preview?.host ?? server.host,
    allowedHosts: preview?.allowedHosts ?? server.allowedHosts,
    https: preview?.https ?? server.https,
    open: preview?.open ?? server.open,
    proxy: preview?.proxy ?? server.proxy,
    cors: preview?.cors ?? server.cors,
    headers: preview?.headers ?? server.headers,
  }
}

export interface PreviewServer {
  /**
   * The resolved vite config object
   */
  config: ResolvedConfig
  /**
   * Stop the server.
   */
  close(): Promise<void>
  /**
   * A Hono app instance.
   * - Can be used to attach custom middlewares to the dev server.
   * - Can also be used as the handler function in Service Worker's fetch event
   * - Compatible with Web Standard Request/Response API
   */
  middlewares: Hono<ViteEnv, BlankSchema, '/'>
  // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
  // /**
  //  * A connect app instance.
  //  * - Can be used to attach custom middlewares to the preview server.
  //  * - Can also be used as the handler function of a custom http server
  //  *   or as a middleware in any connect-style Node.js frameworks
  //  *
  //  * https://github.com/senchalabs/connect#use-middleware
  //  */
  // middlewares: Connect.Server
  /**
   * native Node http server instance
   */
  httpServer: HttpServer
  /**
   * The resolved urls Vite prints on the CLI (URL-encoded). Returns `null`
   * if the server is not listening on any port.
   */
  resolvedUrls: ResolvedServerUrls | null
  /**
   * Print server urls
   */
  printUrls(): void
  /**
   * Bind CLI shortcuts
   */
  bindCLIShortcuts(options?: BindCLIShortcutsOptions<PreviewServer>): void
  /**
   * @internal
   */
  _shortcutsState?: ShortcutsState<PreviewServer>
}

// TODO: fill in later ...

export type PreviewServerHook = (
  this: MinimalPluginContextWithoutEnvironment,
  server: PreviewServer,
) => (() => void) | void | Promise<(() => void) | void>

// TODO: fill in later ...
