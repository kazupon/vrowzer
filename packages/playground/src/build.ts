import { BaseEnvironment } from './baseEnvironment.ts'
import {
  DEFAULT_ASSETS_INLINE_LIMIT,
  ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
} from './constants.ts'
import { mergeConfig, mergeWithDefaults, setupRollupOptionCompat, unique } from './utils.ts'

import type {
  BuildEnvironmentOptions,
  BuilderOptions,
  EnvironmentOptions,
  ResolvedBuildEnvironmentOptions,
  ResolvedConfig
} from 'vite'
import type { ResolvedEnvironmentOptions } from './config.ts'

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

const _builderOptionsDefaults = Object.freeze({
  sharedConfigBuild: false,
  sharedPlugins: false
  // buildApp
} satisfies BuilderOptions)
export const builderOptionsDefaults: Readonly<Partial<BuilderOptions>> = _builderOptionsDefaults

export function resolveBuildEnvironmentOptions(
  raw: BuildEnvironmentOptions,
  // FIXME(kazupon): logger: Logger,
  logger: Console,
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
