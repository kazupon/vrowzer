import type { CommonServerOptions } from './http'
import type { MinimalPluginContextWithoutEnvironment } from './plugin'
import type { RequiredExceptFor } from './typeUtils'

// TODO: fill in later ...

export interface PreviewOptions extends CommonServerOptions { }

export interface ResolvedPreviewOptions extends RequiredExceptFor<
  PreviewOptions,
  'host' | 'https' | 'proxy'
> { }

// TODO: fill in later ...

export interface PreviewServer {
  // TODO: fill!
}

// TODO: fill in later ...

export type PreviewServerHook = (
  this: MinimalPluginContextWithoutEnvironment,
  server: PreviewServer,
) => (() => void) | void | Promise<(() => void) | void>

// TODO: fill in later ...
