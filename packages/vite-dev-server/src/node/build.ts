// TODO: fill in later

import type {
  RolldownOptions,
  RolldownOutput,
  RolldownWatcher
} from 'rolldown'

import type { MinimalPluginContextWithoutEnvironment } from './plugin'

// TODO: fill in later

import type { RollupCommonJSOptions } from '#dep-types/commonjs'
import type { RollupDynamicImportVarsOptions } from '#dep-types/dynamicImportVars'

// TODO: fill in later

import {
  mergeConfig
} from './utils'

// TODO: fill in later

import type {
  EnvironmentOptions,
  ResolvedConfig,
  ResolvedEnvironmentOptions
} from './config'

import { BaseEnvironment } from './baseEnvironment'

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
  // TODO: enable later ...
  // target?: 'baseline-widely-available' | EsbuildTarget | false
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
  // TODO: enable later ...
  // modulePreload?: boolean | ModulePreloadOptions
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
  // TODO: enable later ...
  // cssTarget?: EsbuildTarget | false
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
  // TODO: enable later ...
  // terserOptions?: TerserOptions
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
  // TODO: enable later ...
  // license?: boolean | LicenseOptions
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
  // TODO: enable later ...
  // lib?: LibraryOptions | false
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
  // TODO: enable later ...
  // watch?: WatcherOptions | null
  /**
   * create the Build Environment instance
   */
  // TODO: enable later ...
  // createEnvironment?: (
  //   name: string,
  //   config: ResolvedConfig,
  // ) => Promise<BuildEnvironment> | BuildEnvironment
}

export type BuildOptions = BuildEnvironmentOptions

// TODO: fill in later

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

// TODO: fill in later

export type BuildAppHook = (
  this: MinimalPluginContextWithoutEnvironment,
  builder: ViteBuilder,
) => Promise<void>
