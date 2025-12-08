import { DEFAULT_ASSETS_INLINE_LIMIT } from './constants.ts'

import type { BuildEnvironmentOptions, BuilderOptions } from 'vite'

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
