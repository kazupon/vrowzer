import { CSS_LANGS_RE, ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET } from '../constants.ts'
import { arraify, mergeWithDefaults } from '../utils.ts'

import type { CSSOptions, LightningCSSOptions, ResolvedCSSOptions } from 'vite'

const _cssConfigDefaults = Object.freeze({
  /** @experimental */
  transformer: 'postcss',
  // modules
  // preprocessorOptions
  preprocessorMaxWorkers: true,
  // postcss
  /** @experimental */
  devSourcemap: false
  // lightningcss
} satisfies CSSOptions)
export const cssConfigDefaults: Readonly<Partial<CSSOptions>> = _cssConfigDefaults

export function resolveCSSOptions(options: CSSOptions | undefined): ResolvedCSSOptions {
  const resolved = mergeWithDefaults(_cssConfigDefaults, options ?? {})
  if (resolved.transformer === 'lightningcss') {
    resolved.lightningcss ??= {}
    resolved.lightningcss.targets ??= convertTargets(ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET)
  }
  return resolved
}

// ---

const directRequestRE = /[?&]direct\b/

// ---

export const isDirectCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request) && directRequestRE.test(request)

// ---

// Convert https://esbuild.github.io/api/#target
// To https://github.com/parcel-bundler/lightningcss/blob/master/node/targets.d.ts

const map: Record<string, keyof NonNullable<LightningCSSOptions['targets']> | false | undefined> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  hermes: false,
  ie: 'ie',
  ios: 'ios_saf',
  node: false,
  opera: 'opera',
  rhino: false,
  safari: 'safari'
}

const esMap: Record<number, string[]> = {
  // https://caniuse.com/?search=es2015
  2015: ['chrome49', 'edge13', 'safari10', 'firefox44', 'opera36'],
  // https://caniuse.com/?search=es2016
  2016: ['chrome50', 'edge13', 'safari10', 'firefox43', 'opera37'],
  // https://caniuse.com/?search=es2017
  2017: ['chrome58', 'edge15', 'safari11', 'firefox52', 'opera45'],
  // https://caniuse.com/?search=es2018
  2018: ['chrome63', 'edge79', 'safari12', 'firefox58', 'opera50'],
  // https://caniuse.com/?search=es2019
  2019: ['chrome73', 'edge79', 'safari12.1', 'firefox64', 'opera60'],
  // https://caniuse.com/?search=es2020
  2020: ['chrome80', 'edge80', 'safari14.1', 'firefox80', 'opera67'],
  // https://caniuse.com/?search=es2021
  2021: ['chrome85', 'edge85', 'safari14.1', 'firefox80', 'opera71'],
  // https://caniuse.com/?search=es2022
  2022: ['chrome94', 'edge94', 'safari16.4', 'firefox93', 'opera80'],
  // https://caniuse.com/?search=es2023
  2023: ['chrome110', 'edge110', 'safari16.4', 'opera96']
}

const esRE = /es(\d{4})/
const versionRE = /\d/

const convertTargetsCache = new Map<string | string[], LightningCSSOptions['targets']>()
const convertTargets = (
  esbuildTarget: string | string[] | false
): LightningCSSOptions['targets'] => {
  if (!esbuildTarget) return {}
  const cached = convertTargetsCache.get(esbuildTarget)
  if (cached) return cached
  const targets: LightningCSSOptions['targets'] = {}

  const entriesWithoutES = arraify(esbuildTarget).flatMap(e => {
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
          .map(v => parseInt(v, 10))
        // @ts-expect-error -- FIXME(kazupon): types
        if (!isNaN(major) && !isNaN(minor)) {
          // @ts-expect-error -- FIXME(kazupon): types
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

// export function resolveLibCssFilename(
//   libOptions: LibraryOptions,
//   root: string,
//   packageCache?: PackageCache,
// ): string {
//   if (typeof libOptions.cssFileName === 'string') {
//     return `${libOptions.cssFileName}.css`
//   } else if (typeof libOptions.fileName === 'string') {
//     return `${libOptions.fileName}.css`
//   }
//
//   const packageJson = findNearestMainPackageData(root, packageCache)?.data
//   const name = packageJson ? getPkgName(packageJson.name) : undefined
//
//   if (!name)
//     throw new Error(
//       'Name in package.json is required if option "build.lib.cssFileName" is not provided.',
//     )
//
//   return `${name}.css`
// }
