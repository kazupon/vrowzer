import type {
  LessPreprocessorBaseOptions,
  SassModernPreprocessBaseOptions,
  StylusPreprocessorBaseOptions,
} from '#types/internal/cssPreprocessorOptions'
import type { LightningCSSOptions } from '#types/internal/lightningcssOptions'
import type * as PostCSS from 'postcss'
import type {
  ExistingRawSourceMap,
  RollupError
} from 'rolldown'
import type { PartialEnvironment } from '../baseEnvironment'
import {
  CSS_LANGS_RE,
  ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
} from '../constants'
import type { ResolveIdFn } from '../idResolver'
import {
  arraify,
  mergeWithDefaults
} from '../utils'

const decoder = new TextDecoder()
// const debug = createDebugger('vite:css')

export interface CSSOptions {
  /**
    * Using lightningcss is an experimental option to handle CSS modules,
    * assets and imports via Lightning CSS. It requires to install it as a
    * peer dependency.
    *
    * @default 'postcss'
    * @experimental
    */
  transformer?: 'postcss' | 'lightningcss'
  /**
   * https://github.com/css-modules/postcss-modules
   */
  modules?: CSSModulesOptions | false
  /**
   * Options for preprocessors.
   *
   * In addition to options specific to each processors, Vite supports `additionalData` option.
   * The `additionalData` option can be used to inject extra code for each style content.
   */
  preprocessorOptions?: {
    scss?: SassPreprocessorOptions
    sass?: SassPreprocessorOptions
    less?: LessPreprocessorOptions
    styl?: StylusPreprocessorOptions
    stylus?: StylusPreprocessorOptions
  }

  /**
   * If this option is set, preprocessors will run in workers when possible.
   * `true` means the number of CPUs minus 1.
   *
   * @default true
   */
  preprocessorMaxWorkers?: number | true
  postcss?:
  | string
  | (PostCSS.ProcessOptions & {
    plugins?: PostCSS.AcceptedPlugin[]
  })
  /**
   * Enables css sourcemaps during dev
   * @default false
   * @experimental
   */
  devSourcemap?: boolean

  /**
   * @experimental
   */
  lightningcss?: LightningCSSOptions
}

export interface CSSModulesOptions {
  getJSON?: (
    cssFileName: string,
    json: Record<string, string>,
    outputFileName: string,
  ) => void
  scopeBehaviour?: 'global' | 'local'
  globalModulePaths?: RegExp[]
  exportGlobals?: boolean
  generateScopedName?:
  | string
  | ((name: string, filename: string, css: string) => string)
  hashPrefix?: string
  /**
   * default: undefined
   */
  localsConvention?:
  | 'camelCase'
  | 'camelCaseOnly'
  | 'dashes'
  | 'dashesOnly'
  | ((
    originalClassName: string,
    generatedClassName: string,
    inputFile: string,
  ) => string)
}

const _cssConfigDefaults = Object.freeze({
  /** @experimental */
  transformer: 'postcss',
  // modules
  // preprocessorOptions
  preprocessorMaxWorkers: true,
  // postcss
  /** @experimental */
  devSourcemap: false,
  // lightningcss
} satisfies CSSOptions)
export const cssConfigDefaults: Readonly<Partial<CSSOptions>> =
  _cssConfigDefaults

export type ResolvedCSSOptions = Omit<CSSOptions, 'lightningcss'> &
  Required<Pick<CSSOptions, 'transformer' | 'devSourcemap'>> & {
    lightningcss?: LightningCSSOptions
  }

export function resolveCSSOptions(
  options: CSSOptions | undefined,
): ResolvedCSSOptions {
  const resolved = mergeWithDefaults(_cssConfigDefaults, options ?? {})
  if (resolved.transformer === 'lightningcss') {
    resolved.lightningcss ??= {}
    resolved.lightningcss.targets ??= convertTargets(
      ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET,
    )
  }
  return resolved
}

const cssModuleRE = new RegExp(`\\.module${CSS_LANGS_RE.source}`)
const directRequestRE = /[?&]direct\b/
const htmlProxyRE = /[?&]html-proxy\b/
const htmlProxyIndexRE = /&index=(\d+)/
const commonjsProxyRE = /[?&]commonjs-proxy/
const inlineRE = /[?&]inline\b/
const inlineCSSRE = /[?&]inline-css\b/
const styleAttrRE = /[?&]style-attr\b/
const functionCallRE = /^[A-Z_][.\w-]*\(/i
const transformOnlyRE = /[?&]transform-only\b/
const nonEscapedDoubleQuoteRe = /(?<!\\)"/g

const defaultCssBundleName = 'style.css'

const enum PreprocessLang {
  less = 'less',
  sass = 'sass',
  scss = 'scss',
  styl = 'styl',
  stylus = 'stylus',
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- bug in typescript-eslint
const enum PureCssLang {
  css = 'css',
}
const enum PostCssDialectLang {
  sss = 'sugarss',
}
type CssLang =
  | keyof typeof PureCssLang
  | keyof typeof PreprocessLang
  | keyof typeof PostCssDialectLang

export const isModuleCSSRequest = (request: string): boolean =>
  cssModuleRE.test(request)

export const isDirectCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request) && directRequestRE.test(request)

export const isDirectRequest = (request: string): boolean =>
  directRequestRE.test(request)

// TODO: fill in later ...

interface CSSAtImportResolvers {
  css: ResolveIdFn
  sass: ResolveIdFn
  less: ResolveIdFn
}

// TODO: fill in later ...

// Preprocessor support. This logic is largely replicated from @vue/compiler-sfc

type PreprocessorAdditionalDataResult =
  | string
  | { content: string; map?: ExistingRawSourceMap }

type PreprocessorAdditionalData =
  | string
  | ((
    source: string,
    filename: string,
  ) =>
    | PreprocessorAdditionalDataResult
    | Promise<PreprocessorAdditionalDataResult>)

export type SassPreprocessorOptions = {
  additionalData?: PreprocessorAdditionalData
} & SassModernPreprocessBaseOptions

export type LessPreprocessorOptions = {
  additionalData?: PreprocessorAdditionalData
} & LessPreprocessorBaseOptions

export type StylusPreprocessorOptions = {
  additionalData?: PreprocessorAdditionalData
} & StylusPreprocessorBaseOptions

type StylePreprocessorInternalOptions = {
  maxWorkers?: number | true
  filename: string
  enableSourcemap: boolean
}

type SassStylePreprocessorInternalOptions = StylePreprocessorInternalOptions &
  SassPreprocessorOptions

type LessStylePreprocessorInternalOptions = StylePreprocessorInternalOptions &
  LessPreprocessorOptions

type StylusStylePreprocessorInternalOptions = StylePreprocessorInternalOptions &
  StylusPreprocessorOptions

type StylePreprocessor<Options extends StylePreprocessorInternalOptions> = {
  process: (
    environment: PartialEnvironment,
    source: string,
    root: string,
    options: Options,
    resolvers: CSSAtImportResolvers,
  ) => StylePreprocessorResults | Promise<StylePreprocessorResults>
  close: () => void
}

export interface StylePreprocessorResults {
  code: string
  map?: ExistingRawSourceMap | undefined
  additionalMap?: ExistingRawSourceMap | undefined
  error?: RollupError
  deps: string[]
}

// TODO: fill in later ...

// Convert https://esbuild.github.io/api/#target
// To https://github.com/parcel-bundler/lightningcss/blob/master/node/targets.d.ts

const map: Record<
  string,
  keyof NonNullable<LightningCSSOptions['targets']> | false | undefined
> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  hermes: false,
  ie: 'ie',
  ios: 'ios_saf',
  node: false,
  opera: 'opera',
  rhino: false,
  safari: 'safari',
}

const esMap: Record<number, string[]> = {
  // https://caniuse.com/?search=es2015
  2015: ['chrome49', 'edge13', 'safari10', 'ios10', 'firefox44', 'opera36'],
  // https://caniuse.com/?search=es2016
  2016: ['chrome50', 'edge13', 'safari10', 'ios10', 'firefox43', 'opera37'],
  // https://caniuse.com/?search=es2017
  2017: ['chrome58', 'edge15', 'safari11', 'ios11', 'firefox52', 'opera45'],
  // https://caniuse.com/?search=es2018
  2018: ['chrome63', 'edge79', 'safari12', 'ios12', 'firefox58', 'opera50'],
  // https://caniuse.com/?search=es2019
  2019: ['chrome73', 'edge79', 'safari12.1', 'ios12.1', 'firefox64', 'opera60'],
  // https://caniuse.com/?search=es2020
  2020: ['chrome80', 'edge80', 'safari14.1', 'ios14.5', 'firefox80', 'opera67'],
  // https://caniuse.com/?search=es2021
  2021: ['chrome85', 'edge85', 'safari14.1', 'ios14.5', 'firefox80', 'opera71'],
  // https://caniuse.com/?search=es2022
  2022: ['chrome94', 'edge94', 'safari16.4', 'ios16.4', 'firefox93', 'opera80'],
  // https://caniuse.com/?search=es2023
  2023: [
    'chrome110',
    'edge110',
    'safari16.4',
    'ios16.4',
    'firefox146',
    'opera96',
  ],
  // https://caniuse.com/sr-es15
  2024: [
    'chrome119',
    'edge119',
    'safari17.4',
    'ios17.4',
    'firefox145',
    'opera105',
  ],
}

const esRE = /es(\d{4})/
const versionRE = /\d/

const convertTargetsCache = new Map<
  string | string[],
  LightningCSSOptions['targets']
>()
export const convertTargets = (
  esbuildTarget: string | string[] | false,
): LightningCSSOptions['targets'] => {
  if (!esbuildTarget) return {}
  const cached = convertTargetsCache.get(esbuildTarget)
  if (cached) return cached
  const targets: LightningCSSOptions['targets'] = {}

  const entriesWithoutES = arraify(esbuildTarget).flatMap((e) => {
    const match = esRE.exec(e)
    if (!match) return e
    const year = Number(match[1])
    if (!esMap[year]) throw new Error(`Unsupported target "${e}"`)
    return esMap[year]
  })

  for (const entry of entriesWithoutES) {
    if (entry === 'esnext') continue
    const index = entry.search(versionRE)
    if (index >= 0) {
      const browser = map[entry.slice(0, index)]
      if (browser === false) continue // No mapping available
      if (browser) {
        const [major, minor = 0] = entry
          .slice(index)
          .split('.')
          .map((v) => parseInt(v, 10))
        if (!isNaN(major) && !isNaN(minor)) {
          const version = (major << 16) | (minor << 8)
          if (!targets[browser] || version < targets[browser]!) {
            targets[browser] = version
          }
          continue
        }
      }
    }
    throw new Error(`Unsupported target "${entry}"`)
  }

  convertTargetsCache.set(esbuildTarget, targets)
  return targets
}
