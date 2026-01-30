// ...
import type { MinimalPluginContextWithoutEnvironment } from './plugin'

export interface PreviewServer {
  // TODO: fill!
}

// TODO: fill in later ...

export type PreviewServerHook = (
  this: MinimalPluginContextWithoutEnvironment,
  server: PreviewServer,
) => (() => void) | void | Promise<(() => void) | void>

// TODO: fill in later ...
