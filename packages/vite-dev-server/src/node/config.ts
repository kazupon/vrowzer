
// ...

import type { Alias, AliasOptions } from '#dep-types/alias'
import type { DepOptimizationOptions } from './optimizer'

// ...

import type {
  BuildEnvironmentOptions,
} from './build'

// ...

import {
  type EnvironmentResolveOptions,
  type ResolveOptions,
} from './plugins/resolve'

// ...

export interface DevEnvironmentOptions {
  // TODO: fill in later
}

// ...

type AllResolveOptions = ResolveOptions & {
  alias?: AliasOptions
}

type ResolvedAllResolveOptions = Required<ResolveOptions> & { alias: Alias[] }

export interface SharedEnvironmentOptions {
  /**
   * Define global variable replacements.
   * Entries will be defined on `window` during dev and replaced during build.
   */
  define?: Record<string, any>
  /**
   * Configure resolver
   */
  resolve?: EnvironmentResolveOptions
  /**
   * Define if this environment is used for Server-Side Rendering
   * @default 'server' if it isn't the client environment
   */
  consumer?: 'client' | 'server'
  /**
   * If true, `process.env` referenced in code will be preserved as-is and evaluated in runtime.
   * Otherwise, it is statically replaced as an empty object.
   */
  keepProcessEnv?: boolean
  /**
   * Optimize deps config
   */
  optimizeDeps?: DepOptimizationOptions
}

export interface EnvironmentOptions extends SharedEnvironmentOptions {
  /**
   * Dev specific options
   */
  dev?: DevEnvironmentOptions
  /**
   * Build specific options
   */
  build?: BuildEnvironmentOptions
}

// ...

export type DefaultEnvironmentOptions = Omit<
  EnvironmentOptions,
  'consumer' | 'resolve' | 'keepProcessEnv'
> & {
  resolve?: AllResolveOptions
}

export interface UserConfig extends DefaultEnvironmentOptions {
  // TODO: fill in later
}

// ...

export interface InlineConfig extends UserConfig {
  configFile?: string | false
  /** @experimental */
  configLoader?: 'bundle' | 'runner' | 'native'
  /** @deprecated */
  envFile?: false
  forceOptimizeDeps?: boolean
}

export interface ResolvedConfig extends UserConfig {
  // TODO: fill in later
}

// ...
