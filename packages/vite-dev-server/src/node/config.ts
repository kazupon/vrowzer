// TODO: fill in later

import type { ServerOptions } from './server'

// TODO: fill in later ...

import type {
  HookHandler,
  Plugin,
  PluginWithRequiredHook,
} from './plugin'

// TODO: fill in later ...

import type { Alias, AliasOptions } from '#dep-types/alias'
import type { DepOptimizationOptions } from './optimizer'

// TODO: fill in later ...

import type { MessageChannelServer } from './server/ws'

import type {
  BuildEnvironmentOptions,
  RenderBuiltAssetUrl,
  ResolvedBuildEnvironmentOptions,
} from './build'

// TODO: fill in later ...

import { DevEnvironment } from './server/environment'
import { createDebugger } from './utils'

// TODO: fill in later ...

import type { Logger } from './logger'
import {
  type EnvironmentResolveOptions,
  type ResolveOptions,
} from './plugins/resolve'

// TODO: fill in later ...

import type { RequiredExceptFor } from './typeUtils'

// TODO: fill in later ...

const debug = createDebugger('vite:config', { depth: 10 })

// TODO: fill in later ...

export interface ConfigEnv {
  /**
   * 'serve': during dev (`vite` command)
   * 'build': when building for production (`vite build` command)
   */
  command: 'build' | 'serve'
  mode: string
  isSsrBuild?: boolean
  isPreview?: boolean
}

/**
 * spa: include SPA fallback middleware and configure sirv with `single: true` in preview
 *
 * mpa: only include non-SPA HTML middlewares
 *
 * custom: don't include HTML middlewares
 */
export type AppType = 'spa' | 'mpa' | 'custom'

export type UserConfigFnObject = (env: ConfigEnv) => UserConfig
export type UserConfigFnPromise = (env: ConfigEnv) => Promise<UserConfig>
export type UserConfigFn = (env: ConfigEnv) => UserConfig | Promise<UserConfig>

export type UserConfigExport =
  | UserConfig
  | Promise<UserConfig>
  | UserConfigFnObject
  | UserConfigFnPromise
  | UserConfigFn

/**
 * Type helper to make it easier to use vite.config.ts
 * accepts a direct {@link UserConfig} object, or a function that returns it.
 * The function receives a {@link ConfigEnv} object.
 */
export function defineConfig(config: UserConfig): UserConfig
export function defineConfig(config: Promise<UserConfig>): Promise<UserConfig>
export function defineConfig(config: UserConfigFnObject): UserConfigFnObject
export function defineConfig(config: UserConfigFnPromise): UserConfigFnPromise
export function defineConfig(config: UserConfigFn): UserConfigFn
export function defineConfig(config: UserConfigExport): UserConfigExport
export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config
}

export interface CreateDevEnvironmentContext {
  ws: MessageChannelServer
}

// NOTE(kazupon): comment out because we need to understand the previous implementation as background
// export interface CreateDevEnvironmentContext {
//   ws: WebSocketServer
// }


export interface DevEnvironmentOptions {
  /**
   * Files to be pre-transformed. Supports glob patterns.
   */
  warmup?: string[]
  /**
   * Pre-transform known direct imports
   * defaults to true for the client environment, false for the rest
   */
  preTransformRequests?: boolean
  /**
   * Enables sourcemaps during dev
   * @default { js: true }
   * @experimental
   */
  sourcemap?: boolean | { js?: boolean; css?: boolean }
  /**
   * Whether or not to ignore-list source files in the dev server sourcemap, used to populate
   * the [`x_google_ignoreList` source map extension](https://developer.chrome.com/blog/devtools-better-angular-debugging/#the-x_google_ignorelist-source-map-extension).
   *
   * By default, it excludes all paths containing `node_modules`. You can pass `false` to
   * disable this behavior, or, for full control, a function that takes the source path and
   * sourcemap path and returns whether to ignore the source path.
   */
  sourcemapIgnoreList?:
  | false
  | ((sourcePath: string, sourcemapPath: string) => boolean)

  /**
   * create the Dev Environment instance
   */
  createEnvironment?: (
    name: string,
    config: ResolvedConfig,
    context: CreateDevEnvironmentContext,
  ) => Promise<DevEnvironment> | DevEnvironment

  /**
   * For environments that support a full-reload, like the client, we can short-circuit when
   * restarting the server throwing early to stop processing current files. We avoided this for
   * SSR requests. Maybe this is no longer needed.
   * @experimental
   */
  recoverable?: boolean

  /**
   * For environments associated with a module runner.
   * By default, it is false for the client environment and true for non-client environments.
   * This option can also be used instead of the removed config.experimental.skipSsrTransform.
   */
  moduleRunnerTransform?: boolean
}

// TODO: fill in later ...

export type ResolvedDevEnvironmentOptions = Omit<
  Required<DevEnvironmentOptions>,
  'sourcemapIgnoreList'
> & {
  sourcemapIgnoreList: Exclude<
    DevEnvironmentOptions['sourcemapIgnoreList'],
    false | undefined
  >
}

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

// TODO: fill in later ...

export type ResolvedEnvironmentOptions = {
  define?: Record<string, any>
  // TODO(kazupon): resolve alias type later
  // resolve: ResolvedResolveOptions
  consumer: 'client' | 'server'
  keepProcessEnv?: boolean
  // TODO(kazupon): resolve optimizeDeps type later
  // optimizeDeps: DepOptimizationOptions
  dev: ResolvedDevEnvironmentOptions
  build: ResolvedBuildEnvironmentOptions
  plugins: readonly Plugin[]
  /** @internal */
  optimizeDepsPluginNames: string[]
}

export type DefaultEnvironmentOptions = Omit<
  EnvironmentOptions,
  'consumer' | 'resolve' | 'keepProcessEnv'
> & {
  resolve?: AllResolveOptions
}

export interface UserConfig extends DefaultEnvironmentOptions {
  /**
   * Project root directory. Can be an absolute path, or a path relative from
   * the location of the config file itself.
   * @default process.cwd()
   */
  root?: string
  /**
   * Base public path when served in development or production.
   * @default '/'
   */
  base?: string
  /**
   * Directory to serve as plain static assets. Files in this directory are
   * served and copied to build dist dir as-is without transform. The value
   * can be either an absolute file system path or a path relative to project root.
   *
   * Set to `false` or an empty string to disable copied static assets to build dist dir.
   * @default 'public'
   */
  publicDir?: string | false
  /**
   * Directory to save cache files. Files in this directory are pre-bundled
   * deps or some other cache files that generated by vite, which can improve
   * the performance. You can use `--force` flag or manually delete the directory
   * to regenerate the cache files. The value can be either an absolute file
   * system path or a path relative to project root.
   * Default to `.vite` when no `package.json` is detected.
   * @default 'node_modules/.vite'
   */
  cacheDir?: string
  /**
   * Explicitly set a mode to run in. This will override the default mode for
   * each command, and can be overridden by the command line --mode option.
   */
  mode?: string

  // TODO: fill in later

  /**
   * Server specific options, e.g. host, port, https...
   */
  server?: ServerOptions

  // TODO: fill in later
}

export interface HTMLOptions {
  /**
   * A nonce value placeholder that will be used when generating script/style tags.
   *
   * Make sure that this placeholder will be replaced with a unique value for each request by the server.
   */
  cspNonce?: string
}

export interface FutureOptions {
  removePluginHookHandleHotUpdate?: 'warn'
  removePluginHookSsrArgument?: 'warn'

  removeServerModuleGraph?: 'warn'
  removeServerReloadModule?: 'warn'
  removeServerPluginContainer?: 'warn'
  removeServerHot?: 'warn'
  removeServerTransformRequest?: 'warn'
  removeServerWarmupRequest?: 'warn'

  removeSsrLoadModule?: 'warn'
}

export interface ExperimentalOptions {
  /**
   * Append fake `&lang.(ext)` when queries are specified, to preserve the file extension for following plugins to process.
   *
   * @experimental
   * @default false
   */
  importGlobRestoreExtension?: boolean
  /**
   * Allow finegrain control over assets and public files paths
   *
   * @experimental
   */
  renderBuiltUrl?: RenderBuiltAssetUrl
  /**
   * Enables support of HMR partial accept via `import.meta.hot.acceptExports`.
   *
   * @experimental
   * @default false
   */
  hmrPartialAccept?: boolean
  /**
   * Enable builtin plugin that written by rust, which is faster than js plugin.
   *
   * - 'resolver' (deprecated, will be removed in v8 stable): Enable only the native resolver plugin.
   * - 'v1' (will be deprecated, will be removed in v8 stable): Enable the first stable set of native plugins (including resolver).
   * - 'v2' (will be deprecated, will be removed in v8 stable): Enable the improved dynamicImportVarsPlugin and importGlobPlugin.
   * - true: Enable all native plugins (currently an alias of 'v2', it will map to a newer one in the future versions).
   *
   * @experimental
   * @default 'v2'
   */
  enableNativePlugin?: boolean | 'resolver' | 'v1' | 'v2'
  /**
   * Enable full bundle mode.
   *
   * This is highly experimental.
   *
   * @experimental
   * @default false
   */
  bundledDev?: boolean
}

// TOOD: fill in later ...

export interface InlineConfig extends UserConfig {
  configFile?: string | false
  /** @experimental */
  configLoader?: 'bundle' | 'runner' | 'native'
  /** @deprecated */
  envFile?: false
  forceOptimizeDeps?: boolean
}

export interface ResolvedConfig extends Readonly<
  Omit<
    UserConfig,
    | 'plugins'
    | 'css'
    | 'json'
    | 'assetsInclude'
    | 'optimizeDeps'
    | 'worker'
    | 'build'
    | 'dev'
    | 'environments'
    | 'experimental'
    | 'future'
    | 'server'
    | 'preview'
  > & {
    configFile: string | undefined
    configFileDependencies: string[]
    inlineConfig: InlineConfig
    root: string
    base: string
    /** @internal */
    decodedBase: string
    /** @internal */
    rawBase: string
    publicDir: string
    cacheDir: string
    command: 'build' | 'serve'
    mode: string
    /** `true` when build or full-bundle mode dev */
    isBundled: boolean
    isWorker: boolean
    // in nested worker bundle to find the main config
    /** @internal */
    mainConfig: ResolvedConfig | null
    /** @internal list of bundle entry id. used to detect recursive worker bundle. */
    bundleChain: string[]
    isProduction: boolean
    envDir: string | false
    env: Record<string, any>

    // TODO: fill in later

    logger: Logger

    // TODO: fill in later

    experimental: RequiredExceptFor<ExperimentalOptions, 'renderBuiltUrl'>

    // TODO: fill in later

    environments: Record<string, ResolvedEnvironmentOptions>

    // TODO: fill in later
  }
> { }

// export interface ResolvedConfig extends UserConfig {
//   // TODO: fill in later
// }

// TODO: fill in later

export interface PluginHookUtils {
  getSortedPlugins: <K extends keyof Plugin>(
    hookName: K,
  ) => PluginWithRequiredHook<K>[]
  getSortedPluginHooks: <K extends keyof Plugin>(
    hookName: K,
  ) => NonNullable<HookHandler<Plugin[K]>>[]
}

// TODO: fill in later
