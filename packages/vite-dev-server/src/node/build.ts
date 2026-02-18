import type { RollupCommonJSOptions } from '#dep-types/commonjs'
import type { RollupDynamicImportVarsOptions } from '#dep-types/dynamicImportVars'
import type { EsbuildTarget } from '#types/internal/esbuildOptions'
import type {
  InputOption,
  ModuleFormat,
  RolldownOptions,
  RolldownOutput,
  RolldownWatcher,
  WatcherOptions
} from 'rolldown'
import { BaseEnvironment } from './baseEnvironment'
import type {
  EnvironmentOptions,
  ResolvedConfig,
  ResolvedEnvironmentOptions
} from './config'
import {
  DEFAULT_ASSETS_INLINE_LIMIT,
  ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
} from './constants'
import type { Logger } from './logger'
import type { MinimalPluginContextWithoutEnvironment } from './plugin'
import type { LicenseOptions } from './plugins/license'
import type { TerserOptions } from './plugins/terser'
import {
  mergeConfig,
  mergeWithDefaults,
  setupRollupOptionCompat,
  unique
} from './utils'

// TODO: fill in later

export interface BuildEnvironmentOptions {
  /**
    * Compatibility transform target. The transform is performed with esbuild
    * and the lowest supported target is es2015. Note this only handles
    * syntax transformation and does not cover polyfills
    *
    * Default: 'baseline-widely-available' - transpile targeting browsers that
    * are included in the Baseline Widely Available on 2026-01-01.
    * (Chrome 111+, Edge 111+, Firefox 114+, Safari 16.4+).
    *
    * Another special value is 'esnext' - which only performs minimal transpiling
    * (for minification compat).
    *
    * For custom targets, see https://esbuild.github.io/api/#target and
    * https://esbuild.github.io/content-types/#javascript for more details.
    * @default 'baseline-widely-available'
    */
  target?: 'baseline-widely-available' | EsbuildTarget | false
  /**
   * whether to inject module preload polyfill.
   * Note: does not apply to library mode.
   * @default true
   * @deprecated use `modulePreload.polyfill` instead
   */
  polyfillModulePreload?: boolean
  /**
   * Configure module preload
   * Note: does not apply to library mode.
   * @default true
   */
  modulePreload?: boolean | ModulePreloadOptions
  /**
   * Directory relative from `root` where build output will be placed. If the
   * directory exists, it will be removed before the build.
   * @default 'dist'
   */
  outDir?: string
  /**
   * Directory relative from `outDir` where the built js/css/image assets will
   * be placed.
   * @default 'assets'
   */
  assetsDir?: string
  /**
   * Static asset files smaller than this number (in bytes) will be inlined as
   * base64 strings. If a callback is passed, a boolean can be returned to opt-in
   * or opt-out of inlining. If nothing is returned the default logic applies.
   *
   * Default limit is `4096` (4 KiB). Set to `0` to disable.
   * @default 4096
   */
  assetsInlineLimit?:
  | number
  | ((filePath: string, content: Buffer) => boolean | undefined)
  /**
   * Whether to code-split CSS. When enabled, CSS in async chunks will be
   * inlined as strings in the chunk and inserted via dynamically created
   * style tags when the chunk is loaded.
   * @default true
   */
  cssCodeSplit?: boolean
  /**
   * An optional separate target for CSS minification.
   * As esbuild only supports configuring targets to mainstream
   * browsers, users may need this option when they are targeting
   * a niche browser that comes with most modern JavaScript features
   * but has poor CSS support, e.g. Android WeChat WebView, which
   * doesn't support the #RGBA syntax.
   * @default target
   */
  cssTarget?: EsbuildTarget | false
  /**
   * Override CSS minification specifically instead of defaulting to `build.minify`,
   * so you can configure minification for JS and CSS separately.
   * @default 'lightningcss'
   */
  cssMinify?: boolean | 'lightningcss' | 'esbuild'
  /**
   * If `true`, a separate sourcemap file will be created. If 'inline', the
   * sourcemap will be appended to the resulting output file as data URI.
   * 'hidden' works like `true` except that the corresponding sourcemap
   * comments in the bundled files are suppressed.
   * @default false
   */
  sourcemap?: boolean | 'inline' | 'hidden'
  /**
   * Set to `false` to disable minification, or specify the minifier to use.
   * Available options are 'oxc' or 'terser' or 'esbuild'.
   * @default 'oxc'
   */
  minify?: boolean | 'oxc' | 'terser' | 'esbuild'
  /**
   * Options for terser
   * https://terser.org/docs/api-reference#minify-options
   *
   * In addition, you can also pass a `maxWorkers: number` option to specify the
   * max number of workers to spawn. Defaults to the number of CPUs minus 1.
   */
  terserOptions?: TerserOptions
  /**
   * Alias to `rolldownOptions`
   * @deprecated Use `rolldownOptions` instead.
   */
  rollupOptions?: RolldownOptions
  /**
   * Will be merged with internal rolldown options.
   * https://rolldown.rs/reference/config-options
   */
  rolldownOptions?: RolldownOptions
  /**
   * Options to pass on to `@rollup/plugin-commonjs`
   * @deprecated This option is no-op and will be removed in future versions.
   */
  commonjsOptions?: RollupCommonJSOptions
  /**
   * Options to pass on to `@rollup/plugin-dynamic-import-vars`
   */
  dynamicImportVarsOptions?: RollupDynamicImportVarsOptions
  /**
   * Whether to write bundle to disk
   * @default true
   */
  write?: boolean
  /**
   * Empty outDir on write.
   * @default true when outDir is a sub directory of project root
   */
  emptyOutDir?: boolean | null
  /**
   * Copy the public directory to outDir on write.
   * @default true
   */
  copyPublicDir?: boolean
  /**
   * Whether to emit a `.vite/license.md` file that includes all bundled dependencies'
   * licenses. Pass an object to customize the output file name.
   * @default false
   */
  license?: boolean | LicenseOptions
  /**
   * Whether to emit a .vite/manifest.json in the output dir to map hash-less filenames
   * to their hashed versions. Useful when you want to generate your own HTML
   * instead of using the one generated by Vite.
   *
   * Example:
   *
   * ```json
   * {
   *   "main.js": {
   *     "file": "main.68fe3fad.js",
   *     "css": "main.e6b63442.css",
   *     "imports": [...],
   *     "dynamicImports": [...]
   *   }
   * }
   * ```
   * @default false
   */
  manifest?: boolean | string
  /**
   * Build in library mode. The value should be the global name of the lib in
   * UMD mode. This will produce esm + cjs + umd bundle formats with default
   * configurations that are suitable for distributing libraries.
   * @default false
   */
  lib?: LibraryOptions | false
  /**
   * Produce SSR oriented build. Note this requires specifying SSR entry via
   * `rollupOptions.input`.
   * @default false
   */
  ssr?: boolean | string
  /**
   * Generate SSR manifest for determining style links and asset preload
   * directives in production.
   * @default false
   */
  ssrManifest?: boolean | string
  /**
   * Emit assets during SSR.
   * @default false
   */
  ssrEmitAssets?: boolean
  /**
   * Emit assets during build. Frameworks can set environments.ssr.build.emitAssets
   * By default, it is true for the client and false for other environments.
   */
  emitAssets?: boolean
  /**
   * Set to false to disable reporting compressed chunk sizes.
   * Can slightly improve build speed.
   * @default true
   */
  reportCompressedSize?: boolean
  /**
   * Adjust chunk size warning limit (in kB).
   * @default 500
   */
  chunkSizeWarningLimit?: number
  /**
   * Rollup watch options
   * https://rollupjs.org/configuration-options/#watch
   * @default null
   */
  watch?: WatcherOptions | null
  /**
   * create the Build Environment instance
   */
  createEnvironment?: (
    name: string,
    config: ResolvedConfig,
  ) => Promise<BuildEnvironment> | BuildEnvironment
}

export type BuildOptions = BuildEnvironmentOptions

export interface LibraryOptions {
  /**
   * Path of library entry
   */
  entry: InputOption
  /**
   * The name of the exposed global variable. Required when the `formats` option includes
   * `umd` or `iife`
   */
  name?: string
  /**
   * Output bundle formats
   * @default ['es', 'umd']
   */
  formats?: LibraryFormats[]
  /**
   * The name of the package file output. The default file name is the name option
   * of the project package.json. It can also be defined as a function taking the
   * format as an argument.
   */
  fileName?: string | ((format: ModuleFormat, entryName: string) => string)
  /**
   * The name of the CSS file output if the library imports CSS. Defaults to the
   * same value as `build.lib.fileName` if it's set a string, otherwise it falls
   * back to the name option of the project package.json.
   */
  cssFileName?: string
}

export type LibraryFormats = 'es' | 'cjs' | 'umd' | 'iife' // | 'system'

export interface ModulePreloadOptions {
  /**
   * Whether to inject a module preload polyfill.
   * Note: does not apply to library mode.
   * @default true
   */
  polyfill?: boolean
  /**
   * Resolve the list of dependencies to preload for a given dynamic import
   * @experimental
   */
  resolveDependencies?: ResolveModulePreloadDependenciesFn
}
export interface ResolvedModulePreloadOptions {
  polyfill: boolean
  resolveDependencies?: ResolveModulePreloadDependenciesFn
}

export type ResolveModulePreloadDependenciesFn = (
  filename: string,
  deps: string[],
  context: {
    hostId: string
    hostType: 'html' | 'js'
  },
) => string[]

export interface ResolvedBuildEnvironmentOptions extends Required<
  Omit<BuildEnvironmentOptions, 'polyfillModulePreload'>
> {
  modulePreload: false | ResolvedModulePreloadOptions
}

export interface ResolvedBuildOptions extends Required<
  Omit<BuildOptions, 'polyfillModulePreload'>
> {
  modulePreload: false | ResolvedModulePreloadOptions
}

const _buildEnvironmentOptionsDefaults = Object.freeze({
  target: 'baseline-widely-available',
  /** @deprecated */
  polyfillModulePreload: true,
  modulePreload: true,
  outDir: 'dist',
  assetsDir: 'assets',
  assetsInlineLimit: DEFAULT_ASSETS_INLINE_LIMIT,
  // cssCodeSplit
  // cssTarget
  // cssMinify
  sourcemap: false,
  // minify
  terserOptions: {},
  rolldownOptions: {},
  commonjsOptions: {
    include: [/node_modules/],
    extensions: ['.js', '.cjs'],
  },
  dynamicImportVarsOptions: {
    warnOnError: true,
    exclude: [/node_modules/],
  },
  write: true,
  emptyOutDir: null,
  copyPublicDir: true,
  license: false,
  manifest: false,
  lib: false,
  // ssr
  ssrManifest: false,
  ssrEmitAssets: false,
  // emitAssets
  reportCompressedSize: true,
  chunkSizeWarningLimit: 500,
  watch: null,
  // createEnvironment
} satisfies BuildEnvironmentOptions)
export const buildEnvironmentOptionsDefaults: Readonly<
  Partial<BuildEnvironmentOptions>
> = _buildEnvironmentOptionsDefaults

export function resolveBuildEnvironmentOptions(
  raw: BuildEnvironmentOptions,
  logger: Logger,
  consumer: 'client' | 'server' | undefined,
  isBundledDev: boolean,
): ResolvedBuildEnvironmentOptions {
  const deprecatedPolyfillModulePreload = raw.polyfillModulePreload
  const { polyfillModulePreload, ...rest } = raw
  raw = rest
  if (deprecatedPolyfillModulePreload !== undefined) {
    logger.warn(
      'polyfillModulePreload is deprecated. Use modulePreload.polyfill instead.',
    )
  }
  if (
    deprecatedPolyfillModulePreload === false &&
    raw.modulePreload === undefined
  ) {
    raw.modulePreload = { polyfill: false }
  }

  const merged = mergeWithDefaults(
    {
      ..._buildEnvironmentOptionsDefaults,
      cssCodeSplit: !raw.lib,
      minify: consumer === 'server' || isBundledDev ? false : 'oxc',
      rollupOptions: {},
      rolldownOptions: undefined,
      ssr: consumer === 'server',
      emitAssets: consumer === 'client',
      createEnvironment: (name, config) => new BuildEnvironment(name, config),
    } satisfies BuildEnvironmentOptions,
    raw,
  )
  setupRollupOptionCompat(merged, 'build')
  merged.rolldownOptions = {
    platform: consumer === 'server' ? 'node' : 'browser',
    ...merged.rolldownOptions,
  }

  // handle special build targets
  if (merged.target === 'baseline-widely-available') {
    merged.target = ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
  }
  // dedupe target
  if (Array.isArray(merged.target)) {
    // esbuild allowed duplicate targets but oxc does not
    merged.target = unique(merged.target)
  }

  // normalize false string into actual false
  if ((merged.minify as string) === 'false') {
    merged.minify = false
  } else if (merged.minify === true) {
    merged.minify = 'oxc'
  }

  const defaultModulePreload = {
    polyfill: true,
  }

  const resolved: ResolvedBuildEnvironmentOptions = {
    ...merged,
    cssTarget: merged.cssTarget ?? merged.target,
    cssMinify:
      merged.cssMinify ??
      (consumer === 'server' ? 'lightningcss' : !!merged.minify),
    // Resolve to false | object
    modulePreload:
      merged.modulePreload === false
        ? false
        : merged.modulePreload === true
          ? defaultModulePreload
          : {
            ...defaultModulePreload,
            ...merged.modulePreload,
          },
  }

  return resolved
}

export async function resolveBuildPlugins(config: ResolvedConfig): Promise<{
  pre: Plugin[]
  post: Plugin[]
}> {
  const isBuild = config.command === 'build'
  return {
    pre: [
      // TODO(kazupon): implement later ...
      // ...(isBuild && !config.isWorker ? [prepareOutDirPlugin()] : []),
      // perEnvironmentPlugin(
      //   'vite:rollup-options-plugins',
      //   async (environment) =>
      //     (
      //       await asyncFlatten(
      //         arraify(environment.config.build.rollupOptions.plugins),
      //       )
      //     ).filter(Boolean) as Plugin[],
      // ),
      // ...(config.isWorker ? [webWorkerPostPlugin(config)] : []),
    ],
    post: [
      // TODO(kazupon): implement later ...
      // ...(isBuild ? buildImportAnalysisPlugin(config) : []),
      // ...(config.nativePluginEnabledLevel >= 1 ? [] : [buildOxcPlugin()]),
      // ...(config.build.minify === 'esbuild' ? [buildEsbuildPlugin()] : []),
      // ...(isBuild ? [terserPlugin(config)] : []),
      // ...(isBuild && !config.isWorker
      //   ? [
      //     licensePlugin(),
      //     manifestPlugin(config),
      //     ssrManifestPlugin(),
      //     buildReporterPlugin(config),
      //   ]
      //   : []),
      // nativeLoadFallbackPlugin(),
    ],
  }
}

// TODO: fill in later

export type RenderBuiltAssetUrl = (
  filename: string,
  type: {
    type: 'asset' | 'public'
    hostId: string
    hostType: 'js' | 'css' | 'html'
    ssr: boolean
  },
) => string | { relative?: boolean; runtime?: string } | undefined


// TODO: fill in later

export class BuildEnvironment extends BaseEnvironment {
  mode = 'build' as const

  isBuilt = false
  constructor(
    name: string,
    config: ResolvedConfig,
    setup?: {
      options?: EnvironmentOptions
    },
  ) {
    let options = config.environments[name]
    if (!options) {
      throw new Error(`Environment "${name}" is not defined in the config.`)
    }
    if (setup?.options) {
      options = mergeConfig(
        options,
        setup.options,
      ) as ResolvedEnvironmentOptions
    }
    super(name, config, options)
  }

  async init(): Promise<void> {
    if (this._initiated) {
      return
    }
    this._initiated = true
  }
}

export interface ViteBuilder {
  environments: Record<string, BuildEnvironment>
  config: ResolvedConfig
  buildApp(): Promise<void>
  build(
    environment: BuildEnvironment,
  ): Promise<RolldownOutput | RolldownOutput[] | RolldownWatcher>
}

export interface BuilderOptions {
  /**
   * Whether to share the config instance among environments to align with the behavior of dev server.
   *
   * @default false
   * @experimental
   */
  sharedConfigBuild?: boolean
  /**
   * Whether to share the plugin instances among environments to align with the behavior of dev server.
   *
   * @default false
   * @experimental
   */
  sharedPlugins?: boolean
  buildApp?: (builder: ViteBuilder) => Promise<void>
}

const _builderOptionsDefaults = Object.freeze({
  sharedConfigBuild: false,
  sharedPlugins: false,
  // buildApp
} satisfies BuilderOptions)
export const builderOptionsDefaults: Readonly<Partial<BuilderOptions>> =
  _builderOptionsDefaults

export function resolveBuilderOptions(
  options: BuilderOptions | undefined,
): ResolvedBuilderOptions | undefined {
  if (!options) {return}
  return mergeWithDefaults(
    { ..._builderOptionsDefaults, buildApp: async () => { } },
    options,
  )
}

export type ResolvedBuilderOptions = Required<BuilderOptions>

// TODO: fill in later

export type BuildAppHook = (
  this: MinimalPluginContextWithoutEnvironment,
  builder: ViteBuilder,
) => Promise<void>
