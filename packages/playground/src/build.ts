import { BaseEnvironment } from './baseEnvironment.ts'
import {
  DEFAULT_ASSETS_INLINE_LIMIT,
  ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
} from './constants.ts'
import {
  joinUrlSegments,
  mergeConfig,
  mergeWithDefaults,
  setupRollupOptionCompat,
  unique
} from './utils.ts'

import type {
  BuildEnvironmentOptions,
  BuilderOptions,
  EnvironmentOptions,
  Plugin,
  ResolvedBuildEnvironmentOptions,
  ResolvedConfig
} from 'vite'
import type { ResolvedEnvironmentOptions } from './config.ts'
import type { Logger } from './logger.ts'

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
    extensions: ['.js', '.cjs']
  },
  dynamicImportVarsOptions: {
    warnOnError: true,
    exclude: [/node_modules/]
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
  watch: null
  // createEnvironment
} satisfies BuildEnvironmentOptions)
export const buildEnvironmentOptionsDefaults: Readonly<Partial<BuildEnvironmentOptions>> =
  _buildEnvironmentOptionsDefaults

export function resolveBuildEnvironmentOptions(
  raw: BuildEnvironmentOptions,
  logger: Logger,
  consumer: 'client' | 'server' | undefined
): ResolvedBuildEnvironmentOptions {
  const deprecatedPolyfillModulePreload = raw.polyfillModulePreload
  const { polyfillModulePreload, ...rest } = raw
  raw = rest
  if (deprecatedPolyfillModulePreload !== undefined) {
    logger.warn('polyfillModulePreload is deprecated. Use modulePreload.polyfill instead.')
  }
  if (deprecatedPolyfillModulePreload === false && raw.modulePreload === undefined) {
    raw.modulePreload = { polyfill: false }
  }

  const merged = mergeWithDefaults(
    {
      ..._buildEnvironmentOptionsDefaults,
      cssCodeSplit: !raw.lib,
      minify: consumer === 'server' ? false : 'oxc',
      rollupOptions: {},
      rolldownOptions: undefined,
      ssr: consumer === 'server',
      emitAssets: consumer === 'client',
      createEnvironment: (name, config) => new BuildEnvironment(name, config)
    } satisfies BuildEnvironmentOptions,
    raw
  )
  setupRollupOptionCompat(merged, 'build')
  merged.rolldownOptions = {
    platform: consumer === 'server' ? 'node' : 'browser',
    ...merged.rolldownOptions
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
    polyfill: true
  }

  const resolved: ResolvedBuildEnvironmentOptions = {
    ...merged,
    cssTarget: merged.cssTarget ?? merged.target,
    cssMinify: merged.cssMinify ?? (consumer === 'server' ? 'lightningcss' : !!merged.minify),
    // Resolve to false | object
    modulePreload:
      merged.modulePreload === false
        ? false
        : merged.modulePreload === true
          ? defaultModulePreload
          : {
              ...defaultModulePreload,
              ...merged.modulePreload
            }
  }

  return resolved
}

export async function resolveBuildPlugins(config: ResolvedConfig): Promise<{
  pre: Plugin[]
  post: Plugin[]
}> {
  return {
    pre: [
      // ...(!config.isWorker ? [prepareOutDirPlugin()] : []),
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
      // ...buildImportAnalysisPlugin(config),
      // ...(config.nativePluginEnabledLevel >= 1 ? [] : [buildOxcPlugin()]),
      // ...(config.build.minify === 'esbuild' ? [buildEsbuildPlugin()] : []),
      // terserPlugin(config),
      // ...(!config.isWorker
      //   ? [
      //     licensePlugin(),
      //     manifestPlugin(config),
      //     ssrManifestPlugin(),
      //     buildReporterPlugin(config),
      //   ]
      //   : []),
      // nativeLoadFallbackPlugin(),
    ]
  }
}

// ---
export class BuildEnvironment extends BaseEnvironment {
  mode = 'build' as const

  isBuilt = false
  constructor(
    name: string,
    config: ResolvedConfig,
    setup?: {
      options?: EnvironmentOptions
    }
  ) {
    let options = config.environments[name]
    if (!options) {
      throw new Error(`Environment "${name}" is not defined in the config.`)
    }
    if (setup?.options) {
      options = mergeConfig(options, setup.options) as ResolvedEnvironmentOptions
    }
    // @ts-expect-error -- FIXME(kazupon): types
    super(name, config, options)
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- FIX(kazupon):
  async init(): Promise<void> {
    if (this._initiated) {
      return
    }
    this._initiated = true
  }
}

// ---

const _builderOptionsDefaults = Object.freeze({
  sharedConfigBuild: false,
  sharedPlugins: false
  // buildApp
} satisfies BuilderOptions)
export const builderOptionsDefaults: Readonly<Partial<BuilderOptions>> = _builderOptionsDefaults

export function resolveBuilderOptions(
  options: BuilderOptions | undefined
): ResolvedBuilderOptions | undefined {
  if (!options) return
  return mergeWithDefaults({ ..._builderOptionsDefaults, buildApp: async () => {} }, options)
}

type ResolvedBuilderOptions = Required<BuilderOptions>

// ---

export function toOutputFilePathWithoutRuntime(
  filename: string,
  type: 'asset' | 'public',
  hostId: string,
  hostType: 'js' | 'css' | 'html',
  config: ResolvedConfig,
  toRelative: (filename: string, hostId: string) => string
): string {
  const { renderBuiltUrl } = config.experimental
  let relative = config.base === '' || config.base === './'
  if (renderBuiltUrl) {
    const result = renderBuiltUrl(filename, {
      hostId,
      hostType,
      type,
      ssr: !!config.build.ssr
    })
    if (typeof result === 'object') {
      if (result.runtime) {
        throw new Error(
          `{ runtime: "${result.runtime}" } is not supported for assets in ${hostType} files: ${filename}`
        )
      }
      if (typeof result.relative === 'boolean') {
        relative = result.relative
      }
    } else if (result) {
      return result
    }
  }
  if (relative && !config.build.ssr) {
    return toRelative(filename, hostId)
  } else {
    // @ts-expect-error -- FIXME(kazupon): types
    return joinUrlSegments(config.decodedBase, filename)
  }
}
export const toOutputFilePathInCss: typeof toOutputFilePathWithoutRuntime =
  toOutputFilePathWithoutRuntime
export const toOutputFilePathInHtml: typeof toOutputFilePathWithoutRuntime =
  toOutputFilePathWithoutRuntime

// ---
