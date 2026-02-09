import { DEFAULT_PREVIEW_PORT } from './constants'
import type { CommonServerOptions } from './http'
import type { MinimalPluginContextWithoutEnvironment } from './plugin'
import type {
  ResolvedServerOptions
} from './server'
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
  // TODO: fill!
}

// TODO: fill in later ...

export type PreviewServerHook = (
  this: MinimalPluginContextWithoutEnvironment,
  server: PreviewServer,
) => (() => void) | void | Promise<(() => void) | void>

// TODO: fill in later ...
