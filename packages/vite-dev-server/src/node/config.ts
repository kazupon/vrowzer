import type { Alias, AliasOptions } from '#dep-types/alias'
import type { NormalizedOutputOptions, RolldownOptions } from 'rolldown'
import type { AnymatchFn } from '../types/anymatch'
import type {
  BuildEnvironmentOptions,
  BuilderOptions,
  RenderBuiltAssetUrl,
  ResolvedBuildEnvironmentOptions,
  ResolvedBuildOptions,
  ResolvedBuilderOptions,
} from './build'
import {
  buildEnvironmentOptionsDefaults,
  builderOptionsDefaults
} from './build'
import {
  DEFAULT_EXTENSIONS,
  DEFAULT_EXTERNAL_CONDITIONS,
  DEFAULT_PREVIEW_PORT
} from './constants'
import type { LogLevel, Logger } from './logger'
import type { DepOptimizationOptions } from './optimizer'
import type { PackageCache } from './packages'
import type {
  HookHandler,
  Plugin,
  PluginOption,
  PluginWithRequiredHook,
} from './plugin'
import type { CSSOptions, ResolvedCSSOptions } from './plugins/css'
import {
  cssConfigDefaults,
} from './plugins/css'
import type { ESBuildOptions } from './plugins/esbuild'
import type { JsonOptions } from './plugins/json'
import type { OxcOptions } from './plugins/oxc'
import type {
  EnvironmentResolveOptions,
  InternalResolveOptions,
  ResolveOptions,
} from './plugins/resolve'
import type { PreviewOptions, ResolvedPreviewOptions } from './preview'
import type { ResolvedServerOptions, ServerOptions } from './server'
import { serverConfigDefaults } from './server'
import { DevEnvironment } from './server/environment'
import type { MessageChannelServer } from './server/ws'
import type { ResolvedSSROptions, SSROptions } from './ssr'
import { ssrConfigDefaults } from './ssr'
import type { RequiredExceptFor } from './typeUtils'
import { createDebugger } from './utils'

const debug = createDebugger('vite:config', { depth: 10 })
// TODO: const promisifiedRealpath = promisify(fs.realpath)
const SYMBOL_RESOLVED_CONFIG: unique symbol = Symbol('vite:resolved-config')

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
  /**
   * Array of vite plugins to use.
   */
  plugins?: PluginOption[]
  /**
   * HTML related options
   */
  html?: HTMLOptions
  /**
   * CSS related options (preprocessors and CSS modules)
   */
  css?: CSSOptions
  /**
   * JSON loading options
   */
  json?: JsonOptions
  /**
   * Transform options to pass to esbuild.
   * Or set to `false` to disable esbuild.
   *
   * @deprecated Use `oxc` option instead.
   */
  esbuild?: ESBuildOptions | false
  /**
   * Transform options to pass to Oxc.
   * Or set to `false` to disable Oxc.
   */
  oxc?: OxcOptions | false
  /**
   * Specify additional picomatch patterns to be treated as static assets.
   */
  assetsInclude?: string | RegExp | (string | RegExp)[]
  /**
   * Builder specific options
   * @experimental
   */
  builder?: BuilderOptions
  /**
   * Server specific options, e.g. host, port, https...
   */
  server?: ServerOptions
  /**
   * Preview specific options, e.g. host, port, https...
   */
  preview?: PreviewOptions
  /**
   * Experimental features
   *
   * Features under this field could change in the future and might NOT follow semver.
   * Please be careful and always pin Vite's version when using them.
   * @experimental
   */
  experimental?: ExperimentalOptions
  /**
   * Options to opt-in to future behavior
   */
  future?: FutureOptions | 'warn'
  /**
   * Legacy options
   *
   * Features under this field only follow semver for patches, they could be removed in a
   * future minor version. Please always pin Vite's version to a minor when using them.
   */
  legacy?: LegacyOptions
  /**
   * Log level.
   * @default 'info'
   */
  logLevel?: LogLevel
  /**
   * Custom logger.
   */
  customLogger?: Logger
  /**
   * @default true
   */
  clearScreen?: boolean
  /**
   * Environment files directory. Can be an absolute path, or a path relative from
   * root.
   * @default root
   */
  envDir?: string | false
  /**
   * Env variables starts with `envPrefix` will be exposed to your client source code via import.meta.env.
   * @default 'VITE_'
   */
  envPrefix?: string | string[]
  /**
   * Worker bundle options
   */
  worker?: {
    /**
     * Output format for worker bundle
     * @default 'iife'
     */
    format?: 'es' | 'iife'
    /**
     * Vite plugins that apply to worker bundle. The plugins returned by this function
     * should be new instances every time it is called, because they are used for each
     * rolldown worker bundling process.
     */
    plugins?: () => PluginOption[]
    /**
     * Alias to `rolldownOptions`.
     * @deprecated Use `rolldownOptions` instead.
     */
    rollupOptions?: Omit<
      RolldownOptions,
      'plugins' | 'input' | 'onwarn' | 'preserveEntrySignatures'
    >
    /**
     * Rolldown options to build worker bundle
     */
    rolldownOptions?: Omit<
      RolldownOptions,
      'plugins' | 'input' | 'onwarn' | 'preserveEntrySignatures'
    >
  }
  /**
   * Dep optimization options
   */
  optimizeDeps?: DepOptimizationOptions
  /**
   * SSR specific options
   * We could make SSROptions be a EnvironmentOptions if we can abstract
   * external/noExternal for environments in general.
   */
  ssr?: SSROptions
  /**
   * Environment overrides
   */
  environments?: Record<string, EnvironmentOptions>
  /**
   * Whether your application is a Single Page Application (SPA),
   * a Multi-Page Application (MPA), or Custom Application (SSR
   * and frameworks with custom HTML handling)
   * @default 'spa'
   */
  appType?: AppType
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

export interface LegacyOptions {
  /**
   * In Vite 6.0.8 and below, WebSocket server was able to connect from any web pages. However,
   * that could be exploited by a malicious web page.
   *
   * In Vite 6.0.9+, the WebSocket server now requires a token to connect from a web page.
   * But this may break some plugins and frameworks that connects to the WebSocket server
   * on their own. Enabling this option will make Vite skip the token check.
   *
   * **We do not recommend enabling this option unless you are sure that you are fine with
   * that security weakness.**
   */
  skipWebSocketTokenCheck?: boolean
  /**
   * Opt-in to the pre-Vite 8 CJS interop behavior, which was inconsistent.
   *
   * In pre-Vite 8 versions, Vite had inconsistent CJS interop behavior. This was due to
   * the different behavior of esbuild and the Rollup commonjs plugin.
   * Vite 8+ uses Rolldown for both the dependency optimization in dev and the production build,
   * which aligns the behavior to esbuild.
   *
   * See the Vite 8 migration guide for more details.
   */
  inconsistentCjsInterop?: boolean
}

export interface ResolvedWorkerOptions {
  format: 'es' | 'iife'
  plugins: (bundleChain: string[]) => Promise<ResolvedConfig>
  /**
   * @deprecated Use `rolldownOptions` instead.
   */
  rollupOptions: RolldownOptions
  rolldownOptions: RolldownOptions
}

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
    resolve: Required<ResolveOptions> & {
      alias: Alias[]
    }
    plugins: readonly Plugin[]
    css: ResolvedCSSOptions
    json: Required<JsonOptions>
    /** @deprecated Use `oxc` option instead. */
    esbuild: ESBuildOptions | false
    oxc: OxcOptions | false
    server: ResolvedServerOptions
    dev: ResolvedDevEnvironmentOptions
    /** @experimental */
    builder: ResolvedBuilderOptions | undefined
    build: ResolvedBuildOptions
    preview: ResolvedPreviewOptions
    ssr: ResolvedSSROptions
    assetsInclude: (file: string) => boolean
    rawAssetsInclude: (string | RegExp)[]
    logger: Logger
    /**
      * Create an internal resolver to be used in special scenarios, e.g.
      * optimizer & handling css `@imports`.
      *
      * This API is deprecated. It only works for the client and ssr
      * environments. The `aliasOnly` option is also not being used anymore.
      * Plugins should move to `createIdResolver(environment.config)` instead.
      *
      * @deprecated Use `createIdResolver` from `vite` instead.
      */
    createResolver: (options?: Partial<InternalResolveOptions>) => ResolveFn
    optimizeDeps: DepOptimizationOptions
    /** @internal */
    packageCache: PackageCache
    worker: ResolvedWorkerOptions
    appType: AppType
    experimental: RequiredExceptFor<ExperimentalOptions, 'renderBuiltUrl'>
    future: FutureOptions | undefined
    environments: Record<string, ResolvedEnvironmentOptions>
    /** @internal injected by legacy plugin */
    isOutputOptionsForLegacyChunks?(
      outputOptions: NormalizedOutputOptions,
    ): boolean
    /**
     * The token to connect to the WebSocket server from browsers.
     *
     * We recommend using `import.meta.hot` rather than connecting
     * to the WebSocket server directly.
     * If you have a usecase that requires connecting to the WebSocket
     * server, please create an issue so that we can discuss.
     *
     * @deprecated
     */
    webSocketToken: string
    /** @internal */
    fsDenyGlob: AnymatchFn
    /** @internal */
    safeModulePaths: Set<string>
    /** @internal */
    nativePluginEnabledLevel: number
    /** @internal */
    [SYMBOL_RESOLVED_CONFIG]: true
  } & PluginHookUtils
> { }

// inferred ones are omitted
const configDefaults = Object.freeze({
  define: {},
  dev: {
    warmup: [],
    // preTransformRequests
    /** @experimental */
    sourcemap: { js: true },
    sourcemapIgnoreList: undefined,
    // createEnvironment
    // recoverable
    // moduleRunnerTransform
  },
  build: buildEnvironmentOptionsDefaults,
  resolve: {
    // mainFields
    // conditions
    externalConditions: [...DEFAULT_EXTERNAL_CONDITIONS],
    extensions: DEFAULT_EXTENSIONS,
    dedupe: [],
    /** @experimental */
    noExternal: [],
    external: [],
    preserveSymlinks: false,
    tsconfigPaths: false,
    alias: [],
  },

  // root
  base: '/',
  publicDir: 'public',
  // cacheDir
  // mode
  plugins: [],
  html: {
    cspNonce: undefined,
  },
  css: cssConfigDefaults,
  json: {
    namedExports: true,
    stringify: 'auto',
  },
  // esbuild
  assetsInclude: undefined,
  /** @experimental */
  builder: builderOptionsDefaults,
  server: serverConfigDefaults,
  preview: {
    port: DEFAULT_PREVIEW_PORT,
    // strictPort
    // host
    // https
    // open
    // proxy
    // cors
    // headers
  },
  /** @experimental */
  experimental: {
    importGlobRestoreExtension: false,
    renderBuiltUrl: undefined,
    hmrPartialAccept: false,
    enableNativePlugin: import.meta.env._VITE_TEST_JS_PLUGIN ? false : 'v2',
    // NOTE(kazupon): comment out, because we need to understand the previous implementation as background
    // enableNativePlugin: process.env._VITE_TEST_JS_PLUGIN ? false : 'v2',
    bundledDev: false,
  },
  future: {
    removePluginHookHandleHotUpdate: undefined,
    removePluginHookSsrArgument: undefined,
    removeServerModuleGraph: undefined,
    removeServerHot: undefined,
    removeServerTransformRequest: undefined,
    removeServerWarmupRequest: undefined,
    removeSsrLoadModule: undefined,
  },
  legacy: {
    skipWebSocketTokenCheck: false,
  },
  logLevel: 'info',
  customLogger: undefined,
  clearScreen: true,
  envDir: undefined,
  envPrefix: 'VITE_',
  worker: {
    format: 'iife',
    plugins: (): never[] => [],
    // rollupOptions
  },
  optimizeDeps: {
    include: [],
    exclude: [],
    needsInterop: [],
    // esbuildOptions
    rolldownOptions: {},
    /** @experimental */
    extensions: [],
    /** @deprecated @experimental */
    disabled: 'build',
    // noDiscovery
    /** @experimental */
    holdUntilCrawlEnd: true,
    // entries
    /** @experimental */
    force: false,
    /** @experimental */
    ignoreOutdatedRequests: false,
  },
  ssr: ssrConfigDefaults,
  environments: {},
  appType: 'spa',
} satisfies UserConfig)

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

export type ResolveFn = (
  id: string,
  importer?: string,
  aliasOnly?: boolean,
  ssr?: boolean,
) => Promise<string | undefined>

// TODO: fill in later
