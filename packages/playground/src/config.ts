import path from 'pathe'
import colors from 'picocolors'
import { PartialEnvironment } from './baseEnvironment.ts'
import {
  buildEnvironmentOptionsDefaults,
  builderOptionsDefaults,
  resolveBuildEnvironmentOptions,
  resolveBuilderOptions
} from './build.ts'
import {
  DEFAULT_CLIENT_CONDITIONS,
  DEFAULT_CLIENT_MAIN_FIELDS,
  DEFAULT_EXTENSIONS,
  DEFAULT_EXTERNAL_CONDITIONS,
  DEFAULT_PREVIEW_PORT,
  DEFAULT_SERVER_CONDITIONS,
  DEFAULT_SERVER_MAIN_FIELDS
} from './constants.ts'
import { DevEnvironment } from './environment.ts'
import { createRunnableDevEnvironment } from './environments/runnableEnvironment.ts'
import { createIdResolver } from './idResolver.ts'
import { createLogger } from './logger.ts'
import { resolveEnvironmentPlugins } from './plugin.ts'
import { basePluginContextMeta, BasicMinimalPluginContext } from './pluginContainer.ts'
import { cssConfigDefaults, resolveCSSOptions } from './plugins/css.ts'
import {
  createPluginHookUtils,
  getHookHandler,
  getSortedPluginsByHook,
  resolvePlugins
} from './plugins/index.ts'
import { resolveServerOptions, serverConfigDefaults } from './server.ts'
import { withTrailingSlash } from './shared/utils.ts'
import { resolveSSROptions, ssrConfigDefaults } from './ssr/index.ts'
import {} from './ssr/runtime/serverModuleRunner.ts'
import {
  arraify,
  asyncFlatten,
  createDebugger,
  hasBothRollupOptionsAndRolldownOptions,
  isExternalUrl,
  isInNodeModules,
  isParentDirectory,
  mergeAlias,
  mergeConfig,
  mergeWithDefaults,
  nodeLikeBuiltins,
  normalizeAlias,
  normalizePath,
  setupRollupOptionCompat
} from './utils.ts'

import type { PluginContextMeta, RolldownOptions } from '@rolldown/browser'
import type {
  CreateDevEnvironmentContext,
  DepOptimizationOptions,
  DevEnvironmentOptions,
  EnvironmentOptions,
  HookHandler,
  InlineConfig,
  OxcOptions,
  Plugin,
  ResolvedBuildEnvironmentOptions,
  ResolvedConfig,
  ResolvedDevEnvironmentOptions,
  ResolvedWorkerOptions,
  ResolveOptions,
  UserConfig
} from 'vite'
import type { Logger } from './logger.ts'
import type { PackageCache } from './packages.ts'
import type { FalsyPlugin, PluginWithRequiredHook } from './plugin.ts'
import type { EnvironmentResolveOptions } from './plugins/resolve.ts'
import type { Alias, AliasOptions } from './types.ts'

const debug = createDebugger('vite:config', { depth: 10 })
const SYMBOL_RESOLVED_CONFIG: unique symbol = Symbol('vite:resolved-config')

type ResolvedResolveOptions = Required<ResolveOptions>

type AllResolveOptions = ResolveOptions & {
  alias?: AliasOptions
}
type ResolvedAllResolveOptions = Required<ResolveOptions> & { alias: Alias[] }

export type ResolvedEnvironmentOptions = {
  define?: Record<string, any>
  resolve: ResolvedResolveOptions
  consumer: 'client' | 'server'
  keepProcessEnv?: boolean
  optimizeDeps: DepOptimizationOptions
  dev: ResolvedDevEnvironmentOptions
  build: ResolvedBuildEnvironmentOptions
  plugins: readonly Plugin[]
  /** @internal */
  optimizeDepsPluginNames: string[]
}

// ---

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
// ---

function defaultCreateClientDevEnvironment(
  name: string,
  config: ResolvedConfig,
  context: CreateDevEnvironmentContext
) {
  return new DevEnvironment(name, config, {
    hot: true,
    transport: context.ws
  })
}

function defaultCreateDevEnvironment(name: string, config: ResolvedConfig) {
  return createRunnableDevEnvironment(name, config)
}

// inferred ones are omitted
const configDefaults = Object.freeze({
  define: {},
  dev: {
    warmup: [],
    // preTransformRequests
    /** @experimental */
    sourcemap: { js: true },
    sourcemapIgnoreList: undefined
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
    alias: []
  },

  // root
  base: '/',
  publicDir: 'public',
  // cacheDir
  // mode
  plugins: [],
  html: {
    cspNonce: undefined
  },
  css: cssConfigDefaults,
  json: {
    namedExports: true,
    stringify: 'auto'
  },
  // esbuild
  assetsInclude: undefined,
  /** @experimental */
  builder: builderOptionsDefaults,
  server: serverConfigDefaults,
  preview: {
    port: DEFAULT_PREVIEW_PORT
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
    // TODO(kazupon): enableNativePlugin: process.env._VITE_TEST_JS_PLUGIN ? false : 'v1',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- TODO(kazupon): env
    enableNativePlugin: import.meta.env._VITE_TEST_JS_PLUGIN ? false : 'v1'
  },
  future: {
    removePluginHookHandleHotUpdate: undefined,
    removePluginHookSsrArgument: undefined,
    removeServerModuleGraph: undefined,
    removeServerHot: undefined,
    removeServerTransformRequest: undefined,
    removeServerWarmupRequest: undefined,
    removeSsrLoadModule: undefined
  },
  legacy: {
    skipWebSocketTokenCheck: false
  },
  logLevel: 'info',
  customLogger: undefined,
  clearScreen: true,
  envDir: undefined,
  envPrefix: 'VITE_',
  worker: {
    format: 'iife',
    plugins: (): never[] => []
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
    force: false
  },
  ssr: ssrConfigDefaults,
  environments: {},
  appType: 'spa'
} satisfies UserConfig)

interface ConfigEnv {
  /**
   * 'serve': during dev (`vite` command)
   * 'build': when building for production (`vite build` command)
   */
  command: 'build' | 'serve'
  mode: string
  isSsrBuild?: boolean
  isPreview?: boolean
}

function resolveDevEnvironmentOptions(
  dev: DevEnvironmentOptions | undefined,
  environmentName: string | undefined,
  consumer: 'client' | 'server' | undefined,
  // Backward compatibility
  preTransformRequest?: boolean
): ResolvedDevEnvironmentOptions {
  const resolved = mergeWithDefaults(
    {
      ...configDefaults.dev,
      sourcemapIgnoreList: isInNodeModules,
      preTransformRequests: preTransformRequest ?? consumer === 'client',
      createEnvironment:
        environmentName === 'client'
          ? defaultCreateClientDevEnvironment
          : defaultCreateDevEnvironment,
      recoverable: consumer === 'client',
      moduleRunnerTransform: consumer === 'server'
    },
    dev ?? {}
  )
  // @ts-expect-error -- FIXME(kazupon): types
  return {
    ...resolved,
    sourcemapIgnoreList:
      resolved.sourcemapIgnoreList === false ? () => false : resolved.sourcemapIgnoreList
  }
}

function resolveEnvironmentOptions(
  options: EnvironmentOptions,
  alias: Alias[],
  preserveSymlinks: boolean,
  forceOptimizeDeps: boolean | undefined,
  logger: Logger,
  environmentName: string,
  // Backward compatibility
  isSsrTargetWebworkerSet?: boolean,
  preTransformRequests?: boolean
): ResolvedEnvironmentOptions {
  const isClientEnvironment = environmentName === 'client'
  const consumer = options.consumer ?? (isClientEnvironment ? 'client' : 'server')
  const isSsrTargetWebworkerEnvironment = isSsrTargetWebworkerSet && environmentName === 'ssr'

  if (options.define?.['process.env']) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
    const processEnvDefine = options.define['process.env']
    if (typeof processEnvDefine === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- FIXME(kazupon): types
      const pathKey = Object.entries(processEnvDefine).find(
        // check with toLowerCase() to match with `Path` / `PATH` (Windows uses `Path`)
        ([key, value]) => key.toLowerCase() === 'path' && !!value
      )?.[0]
      if (pathKey) {
        // logger.warnOnce(
        logger.warn(
          colors.yellow(
            `The \`define\` option contains an object with ${JSON.stringify(pathKey)} for "process.env" key. ` +
              'It looks like you may have passed the entire `process.env` object to `define`, ' +
              'which can unintentionally expose all environment variables. ' +
              'This poses a security risk and is discouraged.'
          )
        )
      }
    }
  }

  const resolve = resolveEnvironmentResolveOptions(
    options.resolve,
    alias,
    preserveSymlinks,
    logger,
    consumer,
    isSsrTargetWebworkerEnvironment
  )
  return {
    define: options.define,
    resolve,
    keepProcessEnv:
      options.keepProcessEnv ?? (isSsrTargetWebworkerEnvironment ? false : consumer === 'server'),
    consumer,
    optimizeDeps: resolveDepOptimizationOptions(
      options.optimizeDeps,
      resolve.preserveSymlinks,
      forceOptimizeDeps,
      consumer,
      logger
    ),
    dev: resolveDevEnvironmentOptions(options.dev, environmentName, consumer, preTransformRequests),
    build: resolveBuildEnvironmentOptions(options.build ?? {}, logger, consumer),
    plugins: undefined!, // to be resolved later
    // will be set by `setOptimizeDepsPluginNames` later
    optimizeDepsPluginNames: undefined!
  }
}

function getDefaultEnvironmentOptions(config: UserConfig): EnvironmentOptions {
  return {
    define: config.define,
    resolve: {
      ...config.resolve,
      // mainFields and conditions are not inherited
      mainFields: undefined,
      conditions: undefined
    },
    dev: config.dev,
    build: config.build
  }
}

export interface PluginHookUtils {
  getSortedPlugins: <K extends keyof Plugin>(
    hookName: K
    // @ts-expect-error -- FIXME(kazupon): types
  ) => PluginWithRequiredHook<K>[]
  getSortedPluginHooks: <K extends keyof Plugin>(
    hookName: K
  ) => NonNullable<HookHandler<Plugin[K]>>[]
}

type ResolveFn = (
  id: string,
  importer?: string,
  aliasOnly?: boolean,
  ssr?: boolean
) => Promise<string | undefined>

/**
 * Check and warn if `path` includes characters that don't work well in Vite,
 * such as `#` and `?` and `*`.
 */
function checkBadCharactersInPath(name: string, path: string, logger: Logger): void {
  const badChars = []

  if (path.includes('#')) {
    badChars.push('#')
  }
  if (path.includes('?')) {
    badChars.push('?')
  }
  if (path.includes('*')) {
    badChars.push('*')
  }

  if (badChars.length > 0) {
    const charString = badChars.map(c => `"${c}"`).join(' and ')
    const inflectedChars = badChars.length > 1 ? 'characters' : 'character'

    logger.warn(
      colors.yellow(
        `${name} contains the ${charString} ${inflectedChars} (${colors.cyan(
          path
        )}), which may not work when running Vite. Consider renaming the directory / file to remove the characters.`
      )
    )
  }
}

// const clientAlias = [
//   {
//     find: /^\/?@vite\/env/,
//     replacement: path.posix.join(FS_PREFIX, normalizePath(ENV_ENTRY)),
//   },
//   {
//     find: /^\/?@vite\/client/,
//     replacement: path.posix.join(FS_PREFIX, normalizePath(CLIENT_ENTRY)),
//   },
// ]

/**
 * alias and preserveSymlinks are not per-environment options, but they are
 * included in the resolved environment options for convenience.
 */
function resolveEnvironmentResolveOptions(
  resolve: EnvironmentResolveOptions | undefined,
  alias: Alias[],
  preserveSymlinks: boolean,
  logger: Logger,
  /** undefined when resolving the top-level resolve options */
  consumer: 'client' | 'server' | undefined,
  // Backward compatibility
  isSsrTargetWebworkerEnvironment?: boolean
): ResolvedAllResolveOptions {
  const resolvedResolve: ResolvedAllResolveOptions = mergeWithDefaults(
    {
      ...configDefaults.resolve,
      mainFields:
        consumer === undefined || consumer === 'client' || isSsrTargetWebworkerEnvironment
          ? DEFAULT_CLIENT_MAIN_FIELDS
          : DEFAULT_SERVER_MAIN_FIELDS,
      conditions:
        consumer === undefined || consumer === 'client' || isSsrTargetWebworkerEnvironment
          ? DEFAULT_CLIENT_CONDITIONS
          : DEFAULT_SERVER_CONDITIONS.filter(c => c !== 'browser'),
      builtins:
        resolve?.builtins ??
        (consumer === 'server'
          ? isSsrTargetWebworkerEnvironment && resolve?.noExternal === true
            ? []
            : nodeLikeBuiltins
          : [])
    },
    resolve ?? {}
  )
  resolvedResolve.preserveSymlinks = preserveSymlinks
  resolvedResolve.alias = alias

  if (
    // @ts-expect-error removed field
    resolve?.browserField === false &&
    resolvedResolve.mainFields.includes('browser')
  ) {
    logger.warn(
      colors.yellow(
        `\`resolve.browserField\` is set to false, but the option is removed in favour of ` +
          `the 'browser' string in \`resolve.mainFields\`. You may want to update \`resolve.mainFields\` ` +
          `to remove the 'browser' string and preserve the previous browser behaviour.`
      )
    )
  }
  return resolvedResolve
}

function resolveResolveOptions(
  resolve: AllResolveOptions | undefined,
  logger: Logger
): ResolvedAllResolveOptions {
  // resolve alias with internal client alias
  const alias = normalizeAlias(
    // TODO(kazupon): we need to adgjust client for this system
    // mergeAlias(clientAlias, resolve?.alias || configDefaults.resolve.alias),
    mergeAlias([], resolve?.alias || configDefaults.resolve.alias)
  )
  const preserveSymlinks = resolve?.preserveSymlinks ?? configDefaults.resolve.preserveSymlinks

  if (alias.some(a => a.find === '/')) {
    logger.warn(
      colors.yellow(
        `\`resolve.alias\` contains an alias that maps \`/\`. ` +
          `This is not recommended as it can cause unexpected behavior when resolving paths.`
      )
    )
  }

  return resolveEnvironmentResolveOptions(resolve, alias, preserveSymlinks, logger, undefined)
}

// TODO: Introduce ResolvedDepOptimizationOptions
function resolveDepOptimizationOptions(
  optimizeDeps: DepOptimizationOptions | undefined,
  preserveSymlinks: boolean,
  forceOptimizeDeps: boolean | undefined,
  consumer: 'client' | 'server' | undefined,
  logger: Logger
): DepOptimizationOptions {
  if (
    optimizeDeps?.rolldownOptions &&
    optimizeDeps?.rolldownOptions === optimizeDeps?.rollupOptions
  ) {
    delete optimizeDeps?.rollupOptions
  }
  const merged = mergeWithDefaults(
    {
      ...configDefaults.optimizeDeps,
      disabled: undefined, // do not set here to avoid deprecation warning
      noDiscovery: consumer !== 'client',
      force: forceOptimizeDeps ?? configDefaults.optimizeDeps.force
    },
    optimizeDeps ?? {}
  )
  setupRollupOptionCompat(merged, 'optimizeDeps')

  const rolldownOptions = merged.rolldownOptions as Exclude<
    DepOptimizationOptions['rolldownOptions'],
    undefined
  >

  if (merged.esbuildOptions && Object.keys(merged.esbuildOptions).length > 0) {
    logger.warn(
      colors.yellow(
        `You or a plugin you are using have set \`optimizeDeps.esbuildOptions\` ` +
          `but this option is now deprecated. ` +
          `Vite now uses Rolldown to optimize the dependencies. ` +
          `Please use \`optimizeDeps.rolldownOptions\` instead.`
      )
    )

    rolldownOptions.resolve ??= {}
    rolldownOptions.output ??= {}
    rolldownOptions.transform ??= {}

    const setResolveOptions = <T extends keyof Exclude<RolldownOptions['resolve'], undefined>>(
      key: T,
      value: Exclude<RolldownOptions['resolve'], undefined>[T]
    ) => {
      if (value !== undefined && rolldownOptions.resolve![key] === undefined) {
        rolldownOptions.resolve![key] = value
      }
    }

    if (merged.esbuildOptions.minify !== undefined && rolldownOptions.output.minify === undefined) {
      rolldownOptions.output.minify = merged.esbuildOptions.minify
    }
    if (
      merged.esbuildOptions.treeShaking !== undefined &&
      rolldownOptions.treeshake === undefined
    ) {
      rolldownOptions.treeshake = merged.esbuildOptions.treeShaking
    }
    if (
      merged.esbuildOptions.define !== undefined &&
      rolldownOptions.transform.define === undefined
    ) {
      rolldownOptions.transform.define = merged.esbuildOptions.define
    }
    if (merged.esbuildOptions.loader !== undefined) {
      const loader = merged.esbuildOptions.loader
      rolldownOptions.moduleTypes ??= {}
      for (const [key, value] of Object.entries(loader)) {
        if (
          rolldownOptions.moduleTypes[key] === undefined &&
          value !== 'copy' &&
          value !== 'css' &&
          value !== 'default' &&
          value !== 'file' &&
          value !== 'local-css'
        ) {
          rolldownOptions.moduleTypes[key] = value
        }
      }
    }
    if (
      merged.esbuildOptions.preserveSymlinks !== undefined &&
      rolldownOptions.resolve.symlinks === undefined
    ) {
      rolldownOptions.resolve.symlinks = !merged.esbuildOptions.preserveSymlinks
    }
    setResolveOptions('extensions', merged.esbuildOptions.resolveExtensions)
    setResolveOptions('mainFields', merged.esbuildOptions.mainFields)
    setResolveOptions('conditionNames', merged.esbuildOptions.conditions)
    if (
      merged.esbuildOptions.keepNames !== undefined &&
      rolldownOptions.output.keepNames === undefined
    ) {
      rolldownOptions.output.keepNames = merged.esbuildOptions.keepNames
    }

    if (merged.esbuildOptions.platform !== undefined && rolldownOptions.platform === undefined) {
      rolldownOptions.platform = merged.esbuildOptions.platform
    }

    // NOTE: the following options cannot be converted
    // - legalComments
    // - target, supported (Vite used to transpile down to `ESBUILD_MODULES_TARGET`)
    // - ignoreAnnotations
    // - jsx, jsxFactory, jsxFragment, jsxImportSource, jsxDev, jsxSideEffects
    // - tsconfigRaw, tsconfig

    // NOTE: the following options can be converted but probably not worth it
    // - sourceRoot
    // - sourcesContent (`output.sourcemapExcludeSources` is not supported by rolldown)
    // - drop
    // - dropLabels
    // - mangleProps, reserveProps, mangleQuoted, mangleCache
    // - minifyWhitespace, minifyIdentifiers, minifySyntax
    // - lineLimit
    // - charset
    // - pure (`treeshake.manualPureFunctions` is not supported by rolldown)
    // - alias (it probably does not work the same with `resolve.alias`)
    // - inject
    // - banner, footer
    // - nodePaths

    // NOTE: the following options does not make sense to set / convert it
    // - globalName (we only use ESM format)
    // - color
    // - logLimit
    // - logOverride
    // - splitting
    // - outbase
    // - packages (this should not be set)
    // - allowOverwrite
    // - publicPath (`file` loader is not supported by rolldown)
    // - entryNames, chunkNames, assetNames (Vite does not support changing these options)
    // - stdin
    // - absWorkingDir
  }

  merged.esbuildOptions ??= {}
  merged.esbuildOptions.preserveSymlinks ??= preserveSymlinks

  rolldownOptions.resolve ??= {}
  rolldownOptions.resolve.symlinks ??= !preserveSymlinks
  rolldownOptions.output ??= {}
  rolldownOptions.output.topLevelVar ??= true

  return merged
}

async function setOptimizeDepsPluginNames(resolvedConfig: ResolvedConfig) {
  await Promise.all(
    Object.values(resolvedConfig.environments).map(async environment => {
      const plugins = environment.optimizeDeps.rolldownOptions?.plugins ?? []
      const outputPlugins = environment.optimizeDeps.rolldownOptions?.output?.plugins ?? []
      const flattenedPlugins = await asyncFlatten([plugins, outputPlugins])

      const pluginNames = []
      for (const plugin of flattenedPlugins) {
        if (plugin && 'name' in plugin) {
          pluginNames.push(plugin.name)
        }
      }
      // @ts-expect-error -- FIXME(kazupon):
      environment.optimizeDepsPluginNames = pluginNames
    })
  )
}

// function applyDepOptimizationOptionCompat(resolvedConfig: ResolvedConfig) {
//   if (
//     resolvedConfig.optimizeDeps.esbuildOptions?.plugins &&
//     resolvedConfig.optimizeDeps.esbuildOptions.plugins.length > 0
//   ) {
//     resolvedConfig.optimizeDeps.rolldownOptions ??= {}
//     resolvedConfig.optimizeDeps.rolldownOptions.plugins ||= []
//       ; (resolvedConfig.optimizeDeps.rolldownOptions.plugins as any[]).push(
//         ...resolvedConfig.optimizeDeps.esbuildOptions.plugins.map((plugin) =>
//           convertEsbuildPluginToRolldownPlugin(plugin),
//         ),
//       )
//   }
// }

export function isResolvedConfig(
  inlineConfig: InlineConfig | ResolvedConfig
): inlineConfig is ResolvedConfig {
  return (SYMBOL_RESOLVED_CONFIG in inlineConfig && inlineConfig[SYMBOL_RESOLVED_CONFIG]) as boolean
}

export async function resolveConfig(
  inlineConfig: InlineConfig,
  command: 'build' | 'serve',
  defaultMode = 'development',
  defaultNodeEnv = 'development',
  isPreview = false,
  /** @internal */
  patchConfig: ((config: ResolvedConfig) => void) | undefined = undefined,
  /** @internal */
  patchPlugins: ((resolvedPlugins: Plugin[]) => void) | undefined = undefined
): Promise<ResolvedConfig> {
  let config = inlineConfig
  config.build ??= {}
  setupRollupOptionCompat(config.build, 'build')
  config.worker ??= {}
  setupRollupOptionCompat(config.worker, 'worker')
  config.optimizeDeps ??= {}
  setupRollupOptionCompat(config.optimizeDeps, 'optimizeDeps')
  if (config.ssr) {
    config.ssr.optimizeDeps ??= {}
    setupRollupOptionCompat(config.ssr.optimizeDeps, 'ssr.optimizeDeps')
  }

  const configFileDependencies: string[] = []
  let mode = inlineConfig.mode || defaultMode
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- TODO(kazupon): env
  const isNodeEnvSet = !!import.meta.env.NODE_ENV
  const packageCache: PackageCache = new Map()

  // some dependencies e.g. @vue/compiler-* relies on NODE_ENV for getting
  // production-specific behavior, so set it early on
  // if (!isNodeEnvSet) {
  //   process.env.NODE_ENV = defaultNodeEnv
  // }

  const configEnv: ConfigEnv = {
    mode,
    command,
    isSsrBuild: command === 'build' && !!config.build?.ssr,
    isPreview
  }

  // let { configFile } = config
  // if (configFile !== false) {
  //   const loadResult = await loadConfigFromFile(
  //     configEnv,
  //     configFile,
  //     config.root,
  //     config.logLevel,
  //     config.customLogger,
  //     config.configLoader,
  //   )
  //   if (loadResult) {
  //     config = mergeConfig(loadResult.config, config)
  //     configFile = loadResult.path
  //     configFileDependencies = loadResult.dependencies
  //   }
  // }

  // user config may provide an alternative mode. But --mode has a higher priority
  mode = inlineConfig.mode || config.mode || mode
  configEnv.mode = mode

  const filterPlugin = (p: Plugin | FalsyPlugin): p is Plugin => {
    if (!p) {
      return false
    } else if (!p.apply) {
      return true
    } else if (typeof p.apply === 'function') {
      return p.apply({ ...config, mode }, configEnv)
    } else {
      return p.apply === command
    }
  }

  // resolve plugins
  const rawPlugins = (await asyncFlatten(config.plugins || [])).filter(filterPlugin)

  const [prePlugins, normalPlugins, postPlugins] = sortUserPlugins(rawPlugins)

  const isBuild = command === 'build'

  // run config hooks
  const userPlugins = [...prePlugins, ...normalPlugins, ...postPlugins]
  config = await runConfigHook(config, userPlugins, configEnv)

  // Ensure default client and ssr environments
  // If there are present, ensure order { client, ssr, ...custom }
  config.environments ??= {}
  if (!config.environments.ssr && (!isBuild || config.ssr || config.build?.ssr)) {
    // During dev, the ssr environment is always available even if it isn't configure
    // There is no perf hit, because the optimizer is initialized only if ssrLoadModule
    // is called.
    // During build, we only build the ssr environment if it is configured
    // through the deprecated ssr top level options or if it is explicitly defined
    // in the environments config
    config.environments = { ssr: {}, ...config.environments }
  }
  if (!config.environments.client) {
    config.environments = { client: {}, ...config.environments }
  }

  // Define logger
  const logger = createLogger(config.logLevel, {
    allowClearScreen: config.clearScreen,
    customLogger: config.customLogger
  })

  // resolve root
  const resolvedRoot = normalizePath(
    // config.root ? path.resolve(config.root) : process.cwd(),
    // FIXME(kazupon):
    config.root ? path.resolve(config.root) : '/'
  )

  checkBadCharactersInPath('The project root', resolvedRoot, logger)

  const configEnvironmentsClient = config.environments.client!
  configEnvironmentsClient.dev ??= {}

  const deprecatedSsrOptimizeDepsConfig = config.ssr?.optimizeDeps ?? {}
  let configEnvironmentsSsr = config.environments.ssr

  // Backward compatibility: server.warmup.clientFiles/ssrFiles -> environment.dev.warmup
  const warmupOptions = config.server?.warmup
  if (warmupOptions?.clientFiles) {
    configEnvironmentsClient.dev.warmup = warmupOptions.clientFiles
  }
  if (warmupOptions?.ssrFiles) {
    configEnvironmentsSsr ??= {}
    configEnvironmentsSsr.dev ??= {}
    configEnvironmentsSsr.dev.warmup = warmupOptions.ssrFiles
  }

  // Backward compatibility: merge ssr into environments.ssr.config as defaults
  if (configEnvironmentsSsr) {
    configEnvironmentsSsr.optimizeDeps = mergeConfig(
      deprecatedSsrOptimizeDepsConfig,
      configEnvironmentsSsr.optimizeDeps ?? {}
    )
    // merge with `resolve` as the root to merge `noExternal` correctly
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- FIXME(kazupon): types
    configEnvironmentsSsr.resolve = mergeConfig(
      {
        resolve: {
          conditions: config.ssr?.resolve?.conditions,
          externalConditions: config.ssr?.resolve?.externalConditions,
          mainFields: config.ssr?.resolve?.mainFields,
          external: config.ssr?.external,
          noExternal: config.ssr?.noExternal
        }
      } satisfies EnvironmentOptions,
      {
        resolve: configEnvironmentsSsr.resolve ?? {}
      }
    ).resolve
  }

  if (config.build?.ssrEmitAssets !== undefined) {
    configEnvironmentsSsr ??= {}
    configEnvironmentsSsr.build ??= {}
    configEnvironmentsSsr.build.emitAssets = config.build.ssrEmitAssets
  }

  // The client and ssr environment configs can't be removed by the user in the config hook
  if (!config.environments.client || (!config.environments.ssr && !isBuild)) {
    throw new Error('Required environments configuration were stripped out in the config hook')
  }

  // Merge default environment config values
  const defaultEnvironmentOptions = getDefaultEnvironmentOptions(config)
  // Some top level options only apply to the client environment
  const defaultClientEnvironmentOptions: UserConfig = {
    ...defaultEnvironmentOptions,
    resolve: config.resolve, // inherit everything including mainFields and conditions
    optimizeDeps: config.optimizeDeps
  }
  const defaultNonClientEnvironmentOptions: UserConfig = {
    ...defaultEnvironmentOptions,
    dev: {
      ...defaultEnvironmentOptions.dev,
      createEnvironment: undefined,
      warmup: undefined
    },
    build: {
      ...defaultEnvironmentOptions.build,
      createEnvironment: undefined
    }
  }

  for (const name of Object.keys(config.environments)) {
    config.environments[name] = mergeConfig(
      name === 'client' ? defaultClientEnvironmentOptions : defaultNonClientEnvironmentOptions,
      // @ts-expect-error -- FIXME(kazupon): types
      config.environments[name]
    )
  }

  // await runConfigEnvironmentHook(
  //   config.environments,
  //   userPlugins,
  //   logger,
  //   configEnv,
  //   config.ssr?.target === 'webworker',
  // )

  // Backward compatibility: merge config.environments.client.resolve back into config.resolve
  config.resolve ??= {}
  config.resolve.conditions = config.environments.client.resolve?.conditions
  config.resolve.mainFields = config.environments.client.resolve?.mainFields

  // @ts-expect-error -- FIXME(kazupon): types
  const resolvedDefaultResolve = resolveResolveOptions(config.resolve, logger)

  const resolvedEnvironments: Record<string, ResolvedEnvironmentOptions> = {}
  for (const environmentName of Object.keys(config.environments)) {
    resolvedEnvironments[environmentName] = resolveEnvironmentOptions(
      // @ts-expect-error -- FIXME(kazupon): types
      config.environments[environmentName],
      resolvedDefaultResolve.alias,
      resolvedDefaultResolve.preserveSymlinks,
      inlineConfig.forceOptimizeDeps,
      logger,
      environmentName,
      config.ssr?.target === 'webworker',
      config.server?.preTransformRequests
    )
  }

  // Backward compatibility: merge environments.client.optimizeDeps back into optimizeDeps
  // The same object is assigned back for backward compatibility. The ecosystem is modifying
  // optimizeDeps in the ResolvedConfig hook, so these changes will be reflected on the
  // client environment.
  // const backwardCompatibleOptimizeDeps =
  //   // @ts-expect-error -- FIXME(kazupon): types
  //   resolvedEnvironments.client.optimizeDeps

  const resolvedDevEnvironmentOptions = resolveDevEnvironmentOptions(
    config.dev,
    // default environment options
    undefined,
    undefined
  )

  const resolvedBuildOptions = resolveBuildEnvironmentOptions(config.build ?? {}, logger, undefined)

  // Backward compatibility: merge config.environments.ssr back into config.ssr
  // so ecosystem SSR plugins continue to work if only environments.ssr is configured
  const patchedConfigSsr = {
    ...config.ssr,
    external: resolvedEnvironments.ssr?.resolve.external,
    noExternal: resolvedEnvironments.ssr?.resolve.noExternal,
    optimizeDeps: resolvedEnvironments.ssr?.optimizeDeps,
    resolve: {
      ...config.ssr?.resolve,
      conditions: resolvedEnvironments.ssr?.resolve.conditions,
      externalConditions: resolvedEnvironments.ssr?.resolve.externalConditions
    }
  }
  const ssr = resolveSSROptions(patchedConfigSsr, resolvedDefaultResolve.preserveSymlinks)

  // load .env files
  // Backward compatibility: set envDir to false when envFile is false
  let envDir = config.envFile === false ? false : config.envDir
  if (envDir !== false) {
    envDir = config.envDir ? normalizePath(path.resolve(resolvedRoot, config.envDir)) : resolvedRoot
  }

  // const userEnv = loadEnv(mode, envDir, resolveEnvPrefix(config))

  // Note it is possible for user to have a custom mode, e.g. `staging` where
  // development-like behavior is expected. This is indicated by NODE_ENV=development
  // loaded from `.staging.env` and set by us as VITE_USER_NODE_ENV
  // TODO(kazupon):
  // const userNodeEnv = process.env.VITE_USER_NODE_ENV
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- NOTE: env
  const userNodeEnv = import.meta.env.VITE_USER_NODE_ENV
  if (!isNodeEnvSet && userNodeEnv) {
    if (userNodeEnv === 'development') {
      // process.env.NODE_ENV = 'development'
    } else {
      // NODE_ENV=production is not supported as it could break HMR in dev for frameworks like Vue
      logger.warn(
        `NODE_ENV=${userNodeEnv} is not supported in the .env file. ` +
          `Only NODE_ENV=development is supported to create a development build of your project. ` +
          `If you need to set process.env.NODE_ENV, you can set it in the Vite config instead.`
      )
    }
  }

  // const isProduction = process.env.NODE_ENV === 'production'
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- NOTE: env
  const isProduction = import.meta.env.PROD

  // resolve public base url
  const relativeBaseShortcut = config.base === '' || config.base === './'

  // During dev, we ignore relative base and fallback to '/'
  // For the SSR build, relative base isn't possible by means
  // of import.meta.url.
  const resolvedBase = relativeBaseShortcut
    ? !isBuild || config.build?.ssr
      ? '/'
      : './'
    : resolveBaseUrl(config.base, isBuild, logger)

  // resolve cache directory
  // NOTE(kazupon): const pkgDir = findNearestPackageData(resolvedRoot, packageCache)?.dir
  const pkgDir = null
  const cacheDir = normalizePath(
    config.cacheDir
      ? path.resolve(resolvedRoot, config.cacheDir)
      : pkgDir
        ? path.join(pkgDir, `node_modules/.vite`)
        : path.join(resolvedRoot, `.vite`)
  )

  // const assetsFilter =
  //   config.assetsInclude &&
  //     (!Array.isArray(config.assetsInclude) || config.assetsInclude.length)
  //     ? createFilter(config.assetsInclude)
  //     : () => false

  const { publicDir } = config
  const resolvedPublicDir =
    publicDir !== false && publicDir !== ''
      ? normalizePath(
          path.resolve(
            resolvedRoot,

            typeof publicDir === 'string' ? publicDir : configDefaults.publicDir
          )
        )
      : ''

  const server = resolveServerOptions(resolvedRoot, config.server, logger)

  const builder = resolveBuilderOptions(config.builder)

  const BASE_URL = resolvedBase

  const resolvedConfigContext = new BasicMinimalPluginContext(
    {
      ...basePluginContextMeta,
      watchMode:
        (command === 'serve' && !isPreview) || (command === 'build' && !!resolvedBuildOptions.watch)
    } satisfies PluginContextMeta,
    logger
  )

  let resolved: ResolvedConfig

  let createUserWorkerPlugins = config.worker?.plugins
  if (Array.isArray(createUserWorkerPlugins)) {
    // @ts-expect-error backward compatibility
    createUserWorkerPlugins = () => config.worker?.plugins

    logger.warn(
      colors.yellow(
        `worker.plugins is now a function that returns an array of plugins. ` +
          `Please update your Vite config accordingly.\n`
      )
    )
  }

  const createWorkerPlugins = async function (bundleChain: string[]) {
    // Some plugins that aren't intended to work in the bundling of workers (doing post-processing at build time for example).
    // And Plugins may also have cached that could be corrupted by being used in these extra rollup calls.
    // So we need to separate the worker plugin from the plugin that vite needs to run.
    const rawWorkerUserPlugins = (await asyncFlatten(createUserWorkerPlugins?.() || [])).filter(
      filterPlugin
    )

    // resolve worker
    let workerConfig = mergeConfig({}, config)
    const [workerPrePlugins, workerNormalPlugins, workerPostPlugins] =
      sortUserPlugins(rawWorkerUserPlugins)

    // run config hooks
    const workerUserPlugins = [...workerPrePlugins, ...workerNormalPlugins, ...workerPostPlugins]
    workerConfig = await runConfigHook(workerConfig, workerUserPlugins, configEnv)

    const workerResolved: ResolvedConfig = {
      ...workerConfig,
      ...resolved,
      isWorker: true,
      // @ts-expect-error -- FIXME(kazupon): types
      mainConfig: resolved,
      bundleChain
    }

    // Plugins resolution needs the resolved config (minus plugins) so we need to mutate here
    ;(workerResolved.plugins as Plugin[]) = await resolvePlugins(
      workerResolved,
      workerPrePlugins,
      workerNormalPlugins,
      workerPostPlugins
    )

    // run configResolved hooks
    await Promise.all(
      createPluginHookUtils(workerResolved.plugins)
        .getSortedPluginHooks('configResolved')
        .map(hook => hook.call(resolvedConfigContext, workerResolved))
    )

    // Resolve environment plugins after configResolved because there are
    // downstream projects modifying the plugins in it. This may change
    // once the ecosystem is ready.
    // During Build the client environment is used to bundle the worker
    // Avoid overriding the mainConfig (resolved.environments.client)
    ;(workerResolved.environments as Record<string, ResolvedEnvironmentOptions>) = {
      ...workerResolved.environments,
      // @ts-expect-error -- FIXME(kazupon): types
      client: {
        ...workerResolved.environments.client,
        plugins: await resolveEnvironmentPlugins(new PartialEnvironment('client', workerResolved))
      }
    }

    return workerResolved
  }

  const resolvedWorkerOptions: Omit<ResolvedWorkerOptions, 'rolldownOptions'> & {
    rolldownOptions: ResolvedWorkerOptions['rolldownOptions'] | undefined
  } = {
    format: config.worker?.format || 'iife',
    plugins: createWorkerPlugins,
    rollupOptions: config.worker?.rollupOptions || {},
    rolldownOptions: config.worker?.rolldownOptions // will be set by setupRollupOptionCompat if undefined
  }
  setupRollupOptionCompat(resolvedWorkerOptions, 'worker')

  const base = withTrailingSlash(resolvedBase)

  // const preview = resolvePreviewOptions(config.preview, server)

  // const additionalAllowedHosts = getAdditionalAllowedHosts(server, preview)
  // if (Array.isArray(server.allowedHosts)) {
  //   server.allowedHosts.push(...additionalAllowedHosts)
  // }
  // if (Array.isArray(preview.allowedHosts)) {
  //   preview.allowedHosts.push(...additionalAllowedHosts)
  // }

  const oxc: OxcOptions | false | undefined = config.oxc
  if (config.esbuild) {
    if (config.oxc) {
      logger.warn(
        colors.yellow(
          `Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored.`
        ) //  +
        // NOTE(kazupon): ignore node inspect for the browser bundle
        // ` The following esbuild options were set: \`${inspect(config.esbuild)}\``,
      )
    } else {
      // NOTE(kazupon): disable esbuild option and use oxc instead
      // oxc = convertEsbuildConfigToOxcConfig(config.esbuild, logger)
    }
  } else if (config.esbuild === false && config.oxc !== false) {
    logger.warn(
      colors.yellow(
        `\`esbuild\` option is set to false, but \`oxc\` option was not set to false. ` +
          `\`esbuild: false\` does not have effect any more. ` +
          `If you want to disable the default transformation, which is now handled by Oxc, please set \`oxc: false\` instead.`
      )
    )
  }

  const experimental = mergeWithDefaults(configDefaults.experimental, config.experimental ?? {})

  resolved = {
    // NOTE(kazupon): disable configFile for the browser
    // configFile: configFile ? normalizePath(configFile) : undefined,
    configFile: undefined,
    configFileDependencies: configFileDependencies.map(name => normalizePath(path.resolve(name))),
    inlineConfig,
    root: resolvedRoot,
    base,
    decodedBase: decodeBase(base),
    rawBase: resolvedBase,
    publicDir: resolvedPublicDir,
    cacheDir,
    command,
    mode,
    isWorker: false,
    mainConfig: null,
    bundleChain: [],
    isProduction,
    plugins: userPlugins, // placeholder to be replaced
    css: resolveCSSOptions(config.css),
    json: mergeWithDefaults(configDefaults.json, config.json ?? {}),
    // preserve esbuild for buildEsbuildPlugin
    esbuild:
      config.esbuild === false
        ? false
        : {
            jsxDev: !isProduction,
            // change defaults that fit better for vite
            charset: 'utf8',
            legalComments: 'none',
            ...config.esbuild
          },
    oxc:
      oxc === false
        ? false
        : {
            ...oxc,
            jsx:
              typeof oxc?.jsx === 'string'
                ? oxc.jsx
                : {
                    development: oxc?.jsx?.development ?? !isProduction,
                    ...oxc?.jsx
                  }
          },
    server,
    builder,
    // preview,
    envDir,
    env: {
      // TOOD(kazupon): ...userEnv,
      BASE_URL,
      MODE: mode,
      DEV: !isProduction,
      PROD: isProduction
    },
    // assetsInclude(file: string) {
    //   return DEFAULT_ASSETS_RE.test(file) || assetsFilter(file)
    // },
    rawAssetsInclude: config.assetsInclude ? arraify(config.assetsInclude) : [],
    logger,
    packageCache,
    worker: resolvedWorkerOptions,
    appType: config.appType ?? 'spa',
    // @ts-expect-error -- FIXME(kazupon): types
    experimental,
    future:
      config.future === 'warn'
        ? ({
            removePluginHookHandleHotUpdate: 'warn',
            removePluginHookSsrArgument: 'warn',
            removeServerModuleGraph: 'warn',
            removeServerReloadModule: 'warn',
            removeServerPluginContainer: 'warn',
            removeServerHot: 'warn',
            removeServerTransformRequest: 'warn',
            removeServerWarmupRequest: 'warn',
            removeSsrLoadModule: 'warn'
          } satisfies Required<FutureOptions>)
        : config.future,

    ssr,

    // optimizeDeps: backwardCompatibleOptimizeDeps,
    // @ts-expect-error -- FIXME(kazupon): types
    resolve: resolvedDefaultResolve,
    dev: resolvedDevEnvironmentOptions,
    build: resolvedBuildOptions,

    environments: resolvedEnvironments,

    // random 72 bits (12 base64 chars)
    // at least 64bits is recommended
    // https://owasp.org/www-community/vulnerabilities/Insufficient_Session-ID_Length
    // webSocketToken: Buffer.from(
    //   crypto.getRandomValues(new Uint8Array(9)),
    // ).toString('base64url'),

    getSortedPlugins: undefined!,
    getSortedPluginHooks: undefined!,

    createResolver(options) {
      const resolve = createIdResolver(this, options)
      const clientEnvironment = new PartialEnvironment('client', this)
      let ssrEnvironment: PartialEnvironment | undefined
      return async (id, importer, aliasOnly, ssr) => {
        if (ssr) {
          ssrEnvironment ??= new PartialEnvironment('ssr', this)
        }
        return await resolve(ssr ? ssrEnvironment! : clientEnvironment, id, importer, aliasOnly)
      }
    },
    // fsDenyGlob: picomatch(
    //   // matchBase: true does not work as it's documented
    //   // https://github.com/micromatch/picomatch/issues/89
    //   // convert patterns without `/` on our side for now
    //   server.fs.deny.map((pattern) =>
    //     pattern.includes('/') ? pattern : `**/${pattern}`,
    //   ),
    //   {
    //     matchBase: false,
    //     nocase: true,
    //     dot: true,
    //   },
    // ),
    safeModulePaths: new Set<string>(),
    // nativePluginEnabledLevel: resolveNativePluginEnabledLevel(
    //   experimental.enableNativePlugin,
    // ),
    [SYMBOL_RESOLVED_CONFIG]: true
  }
  resolved = {
    ...config,
    ...resolved
  }

  // Backward compatibility hook, modify the resolved config before it is used
  // to create internal plugins. For example, `config.build.ssr`. Once we rework
  // internal plugins to use environment.config, we can remove the dual
  // patchConfig/patchPlugins and have a single patchConfig before configResolved
  // gets called
  patchConfig?.(resolved)

  const resolvedPlugins = await resolvePlugins(resolved, prePlugins, normalPlugins, postPlugins)

  // Backward compatibility hook used in builder, opt-in to shared plugins during build
  patchPlugins?.(resolvedPlugins)
  ;(resolved.plugins as Plugin[]) = resolvedPlugins

  // TODO: Deprecate config.getSortedPlugins and config.getSortedPluginHooks
  Object.assign(resolved, createPluginHookUtils(resolved.plugins))

  // call configResolved hooks
  await Promise.all(
    resolved
      .getSortedPluginHooks('configResolved')
      .map(hook => hook.call(resolvedConfigContext, resolved))
  )

  // Resolve environment plugins after configResolved because there are
  // downstream projects modifying the plugins in it. This may change
  // once the ecosystem is ready.
  for (const name of Object.keys(resolved.environments)) {
    // @ts-expect-error -- FIXME(kazupon): types
    resolved.environments[name].plugins = await resolveEnvironmentPlugins(
      new PartialEnvironment(name, resolved)
    )
  }

  // optimizeDepsDisabledBackwardCompatibility(resolved, resolved.optimizeDeps)
  // optimizeDepsDisabledBackwardCompatibility(
  //   resolved,
  //   resolved.ssr.optimizeDeps,
  //   'ssr.',
  // )

  // For backward compat, set ssr environment build.emitAssets with the same value as build.ssrEmitAssets that might be changed in configResolved hook
  // https://github.com/vikejs/vike/blob/953614cea7b418fcc0309b5c918491889fdec90a/vike/node/plugin/plugins/buildConfig.ts#L67
  if (!resolved.builder?.sharedConfigBuild && resolved.environments.ssr) {
    resolved.environments.ssr.build.emitAssets =
      resolved.build.ssrEmitAssets || resolved.build.emitAssets
  }

  // applyDepOptimizationOptionCompat(resolved)
  await setOptimizeDepsPluginNames(resolved)

  // debug?.(`using resolved config: %O`, {
  console.log(`using resolved config: %O`, {
    ...resolved,
    plugins: resolved.plugins.map(p => p.name),
    worker: {
      ...resolved.worker,
      plugins: `() => plugins`
    }
  })

  // validate config

  // Check if all assetFileNames have the same reference.
  // If not, display a warn for user.
  const outputOption = config.build?.rollupOptions?.output ?? []
  // Use isArray to narrow its type to array
  if (Array.isArray(outputOption)) {
    const assetFileNamesList = outputOption.map(output => output.assetFileNames)
    if (assetFileNamesList.length > 1) {
      const firstAssetFileNames = assetFileNamesList[0]
      const hasDifferentReference = assetFileNamesList.some(
        assetFileNames => assetFileNames !== firstAssetFileNames
      )
      if (hasDifferentReference) {
        resolved.logger.warn(
          colors.yellow(
            `assetFileNames isn't equal for every build.rollupOptions.output. A single pattern across all outputs is supported by Vite.`
          )
        )
      }
    }
  }

  // Warn about removal of experimental features
  if (
    // @ts-expect-error Option removed
    config.legacy?.buildSsrCjsExternalHeuristics ||
    // @ts-expect-error Option removed
    config.ssr?.format === 'cjs'
  ) {
    resolved.logger.warn(
      colors.yellow(`
  (!) Experimental legacy.buildSsrCjsExternalHeuristics and ssr.format were be removed in Vite 5.
      The only SSR Output format is ESM. Find more information at https://github.com/vitejs/vite/discussions/13816.
  `)
    )
  }

  const resolvedBuildOutDir = normalizePath(path.resolve(resolved.root, resolved.build.outDir))
  if (
    isParentDirectory(resolvedBuildOutDir, resolved.root) ||
    resolvedBuildOutDir === resolved.root
  ) {
    resolved.logger.warn(
      colors.yellow(`
  (!) build.outDir must not be the same directory of root or a parent directory of root as this could cause Vite to overwriting source files with build outputs.
  `)
    )
  }

  if (resolved.resolve.tsconfigPaths && resolved.experimental.enableNativePlugin === false) {
    resolved.logger.warn(
      colors.yellow(`
  (!) resolve.tsconfigPaths is set to true, but native plugins are disabled. To use resolve.tsconfigPaths, please enable native plugins via experimental.enableNativePlugin.
  `)
    )
  }

  return Promise.resolve(resolved)
}

/**
 * Resolve base url. Note that some users use Vite to build for non-web targets like
 * electron or expects to deploy
 */
function resolveBaseUrl(
  base: UserConfig['base'] = configDefaults.base,
  isBuild: boolean,
  logger: Logger
): string {
  if (base[0] === '.') {
    logger.warn(
      colors.yellow(
        colors.bold(
          `(!) invalid "base" option: "${base}". The value can only be an absolute ` +
            `URL, "./", or an empty string.`
        )
      )
    )
    return '/'
  }

  // external URL flag
  const isExternal = isExternalUrl(base)
  // no leading slash warn
  if (!isExternal && base[0] !== '/') {
    logger.warn(colors.yellow(colors.bold(`(!) "base" option should start with a slash.`)))
  }

  // parse base when command is serve or base is not External URL
  if (!isBuild || !isExternal) {
    base = new URL(base, 'http://vite.dev').pathname
    // ensure leading slash
    if (base[0] !== '/') {
      base = '/' + base
    }
  }

  return base
}

function decodeBase(base: string): string {
  try {
    return decodeURI(base)
  } catch {
    throw new Error('The value passed to "base" option was malformed. It should be a valid URL.')
  }
}

function sortUserPlugins(
  plugins: (Plugin | Plugin[])[] | undefined
): [Plugin[], Plugin[], Plugin[]] {
  const prePlugins: Plugin[] = []
  const postPlugins: Plugin[] = []
  const normalPlugins: Plugin[] = []

  if (plugins) {
    plugins.flat().forEach(p => {
      if (p.enforce === 'pre') prePlugins.push(p)
      else if (p.enforce === 'post') postPlugins.push(p)
      else normalPlugins.push(p)
    })
  }

  return [prePlugins, normalPlugins, postPlugins]
}

// ---

async function runConfigHook(
  config: InlineConfig,
  plugins: Plugin[],
  configEnv: ConfigEnv
): Promise<InlineConfig> {
  let conf = config

  const tempLogger = createLogger(config.logLevel, {
    allowClearScreen: config.clearScreen,
    customLogger: config.customLogger
  })
  const context = new BasicMinimalPluginContext<Omit<PluginContextMeta, 'watchMode'>>(
    basePluginContextMeta,
    tempLogger
  )

  for (const p of getSortedPluginsByHook('config', plugins)) {
    const hook = p.config
    // @ts-expect-error -- FIXME(kazupon): types
    const handler = getHookHandler(hook)
    const res = await handler.call(context, conf, configEnv)
    if (res && res !== conf) {
      if (hasBothRollupOptionsAndRolldownOptions(res)) {
        context.warn(
          `Both \`rollupOptions\` and \`rolldownOptions\` were specified by ${JSON.stringify(p.name)} plugin. ` +
            `\`rollupOptions\` specified by that plugin will be ignored.`
        )
      }
      if (res.esbuild) {
        context.warn(
          `\`esbuild\` option was specified by ${JSON.stringify(p.name)} plugin. ` +
            `This option is deprecated, please use \`oxc\` instead.`
        )
      }
      if (res.optimizeDeps?.esbuildOptions) {
        context.warn(
          `\`optimizeDeps.esbuildOptions\` option was specified by ${JSON.stringify(p.name)} plugin. ` +
            `This option is deprecated, please use \`optimizeDeps.rolldownOptions\` instead.`
        )
      }
      conf = mergeConfig(conf, res)
    }
  }

  return conf
}
// ---
