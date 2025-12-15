import aliasPlugin from '@rollup/plugin-alias'
import { watchPackageDataPlugin } from '../packages.ts'
import { assetPlugin } from './asset.ts'
import { assetImportMetaUrlPlugin } from './assetImportMetaUrl.ts'
import { clientInjectionsPlugin } from './clientInjections.ts'
import { cssAnalysisPlugin, cssPlugin, cssPostPlugin } from './css.ts'
import { definePlugin } from './define.ts'
import { dynamicImportVarsPlugin } from './dynamicImportVars.ts'
import { esbuildBannerFooterCompatPlugin } from './esbuildBannerFooterCompatPlugin.ts'
import { buildHtmlPlugin, htmlInlineProxyPlugin } from './html.ts'
import { importAnalysisPlugin } from './importAnalysis.ts'
import { importGlobPlugin } from './importMetaGlob.ts'
import { jsonPlugin } from './json.ts'
import { modulePreloadPolyfillPlugin } from './modulePreloadPolyfill.ts'
import { optimizedDepsPlugin } from './optimizedDeps.ts'
import { oxcPlugin } from './oxc.ts'
import { createFilterForTransform, createIdFilter } from './pluginFilter.ts'
import { preAliasPlugin } from './preAlias.ts'
import { resolvePlugin } from './resolve.ts'
import { wasmFallbackPlugin, wasmHelperPlugin } from './wasm.ts'
import { webWorkerPlugin } from './worker.ts'
import { workerImportMetaUrlPlugin } from './workerImportMetaUrl.ts'

import type { ObjectHook } from '@rolldown/browser'
import type { ResolverFunction } from '@rollup/plugin-alias'
import type { Plugin, ResolvedConfig } from 'vite'
import type { PluginHookUtils } from '../config.ts'
import type { HookHandler, PluginWithRequiredHook } from '../plugin.ts'
import type { PluginFilter, TransformHookFilter } from './pluginFilter.ts'

export async function resolvePlugins(
  config: ResolvedConfig,
  prePlugins: Plugin[],
  normalPlugins: Plugin[],
  postPlugins: Plugin[]
): Promise<Plugin[]> {
  const isBuild = config.command === 'build'
  const isWorker = config.isWorker
  const buildPlugins = isBuild
    ? await (await import('../build')).resolveBuildPlugins(config)
    : { pre: [], post: [] }
  const { modulePreload } = config.build
  // @ts-expect-error -- FIXME(kazupon): types
  const enableNativePlugin = config.nativePluginEnabledLevel >= 0
  // @ts-expect-error -- FIXME(kazupon): types
  const enableNativePluginV1 = config.nativePluginEnabledLevel >= 1

  return [
    !isBuild ? optimizedDepsPlugin() : null,
    // @ts-expect-error -- FIXME(kazupon): types
    !isWorker ? watchPackageDataPlugin(config.packageCache) : null,
    !isBuild ? preAliasPlugin(config) : null,
    // NOTE(kazupon): Rollup alias plugin is used only in dev for now
    // isBuild &&
    //   enableNativePluginV1 &&
    //   !config.resolve.alias.some((v) => v.customResolver)
    //   ? nativeAliasPlugin({
    //     entries: config.resolve.alias.map((item) => {
    //       return {
    //         find: item.find,
    //         replacement: item.replacement,
    //       }
    //     }),
    //   })
    //   : aliasPlugin({
    //     // @ts-expect-error aliasPlugin receives rollup types
    //     entries: config.resolve.alias,
    //     customResolver: viteAliasCustomResolver,
    //   }),
    aliasPlugin({
      entries: config.resolve.alias
    }),

    ...prePlugins,

    modulePreload !== false && modulePreload.polyfill ? modulePreloadPolyfillPlugin(config) : null,
    // NOTE(kazupon): use resolvePlugin from vite:resolve
    // ...(enableNativePlugin
    //   ? oxcResolvePlugin(
    //     {
    //       root: config.root,
    //       isProduction: config.isProduction,
    //       isBuild,
    //       packageCache: config.packageCache,
    //       asSrc: true,
    //       optimizeDeps: true,
    //       externalize: true,
    //       legacyInconsistentCjsInterop: config.legacy?.inconsistentCjsInterop,
    //     },
    //     isWorker
    //       ? { ...config, consumer: 'client', optimizeDepsPluginNames: [] }
    //       : undefined,
    //   )
    //   : [
    //     resolvePlugin({
    //       root: config.root,
    //       isProduction: config.isProduction,
    //       isBuild,
    //       packageCache: config.packageCache,
    //       asSrc: true,
    //       optimizeDeps: true,
    //       externalize: true,
    //     }),
    //   ]),
    ...[
      resolvePlugin({
        root: config.root,
        isProduction: config.isProduction,
        isBuild,
        // @ts-expect-error -- FIXME(kazupon): types
        packageCache: config.packageCache,
        asSrc: true,
        optimizeDeps: true,
        externalize: true
      })
    ],
    htmlInlineProxyPlugin(config),
    cssPlugin(config),
    esbuildBannerFooterCompatPlugin(config),
    config.oxc !== false ? oxcPlugin(config) : null,
    jsonPlugin(config.json, isBuild, enableNativePluginV1),
    wasmHelperPlugin(config),
    webWorkerPlugin(config),
    assetPlugin(config),

    ...normalPlugins,

    wasmFallbackPlugin(config),
    definePlugin(config),
    cssPostPlugin(config),
    isBuild && buildHtmlPlugin(config),
    workerImportMetaUrlPlugin(config),
    assetImportMetaUrlPlugin(config),
    ...buildPlugins.pre,
    dynamicImportVarsPlugin(config),
    importGlobPlugin(config),

    ...postPlugins,

    ...buildPlugins.post,

    // internal server-only plugins are always applied after everything else
    ...(isBuild
      ? []
      : [clientInjectionsPlugin(config), cssAnalysisPlugin(config), importAnalysisPlugin(config)])
  ].filter(Boolean) as Plugin[]
}

export function createPluginHookUtils(plugins: readonly Plugin[]): PluginHookUtils {
  // sort plugins per hook
  const sortedPluginsCache = new Map<keyof Plugin, Plugin[]>()
  function getSortedPlugins<K extends keyof Plugin>(
    hookName: K
    // @ts-expect-error -- FIXME(kazupon): types
  ): PluginWithRequiredHook<K>[] {
    if (sortedPluginsCache.has(hookName))
      // @ts-expect-error -- FIXME(kazupon): types
      return sortedPluginsCache.get(hookName) as PluginWithRequiredHook<K>[]
    const sorted = getSortedPluginsByHook(hookName, plugins)
    sortedPluginsCache.set(hookName, sorted)
    return sorted
  }
  function getSortedPluginHooks<K extends keyof Plugin>(
    hookName: K
  ): NonNullable<HookHandler<Plugin[K]>>[] {
    const plugins = getSortedPlugins(hookName)
    // @ts-expect-error -- FIXME(kazupon): types
    return plugins.map(p => getHookHandler(p[hookName])).filter(Boolean)
  }

  return {
    getSortedPlugins,
    getSortedPluginHooks
  }
}

export function getSortedPluginsByHook<K extends keyof Plugin>(
  hookName: K,
  plugins: readonly Plugin[]
  // @ts-expect-error -- FIXME(kazupon): types
): PluginWithRequiredHook<K>[] {
  const sortedPlugins: Plugin[] = []
  // Use indexes to track and insert the ordered plugins directly in the
  // resulting array to avoid creating 3 extra temporary arrays per hook
  let pre = 0,
    normal = 0,
    post = 0
  for (const plugin of plugins) {
    const hook = plugin[hookName]
    if (hook) {
      if (typeof hook === 'object') {
        if (hook.order === 'pre') {
          sortedPlugins.splice(pre++, 0, plugin)
          continue
        }
        if (hook.order === 'post') {
          sortedPlugins.splice(pre + normal + post++, 0, plugin)
          continue
        }
      }
      sortedPlugins.splice(pre + normal++, 0, plugin)
    }
  }

  // @ts-expect-error -- FIXME(kazupon): types
  return sortedPlugins as PluginWithRequiredHook<K>[]
}

export function getHookHandler<T extends ObjectHook<Function>>(hook: T): HookHandler<T> {
  return (typeof hook === 'object' ? hook.handler : hook) as HookHandler<T>
}

type FilterForPluginValue = {
  resolveId?: PluginFilter | undefined
  load?: PluginFilter | undefined
  transform?: TransformHookFilter | undefined
}
const filterForPlugin = new WeakMap<Plugin, FilterForPluginValue>()

export function getCachedFilterForPlugin<H extends 'resolveId' | 'load' | 'transform'>(
  plugin: Plugin,
  hookName: H
): FilterForPluginValue[H] | undefined {
  let filters = filterForPlugin.get(plugin)
  if (filters && hookName in filters) {
    return filters[hookName]
  }

  if (!filters) {
    filters = {}
    filterForPlugin.set(plugin, filters)
  }

  let filter: PluginFilter | TransformHookFilter | undefined
  switch (hookName) {
    case 'resolveId': {
      const rawFilter = extractFilter(plugin.resolveId)?.id
      filters.resolveId = createIdFilter(rawFilter)
      filter = filters.resolveId
      break
    }
    case 'load': {
      const rawFilter = extractFilter(plugin.load)?.id
      filters.load = createIdFilter(rawFilter)
      filter = filters.load
      break
    }
    case 'transform': {
      const rawFilters = extractFilter(plugin.transform)
      filters.transform = createFilterForTransform(
        rawFilters?.id,
        rawFilters?.code,
        rawFilters?.moduleType
      )
      filter = filters.transform
      break
    }
  }
  return filter as FilterForPluginValue[H] | undefined
}

function extractFilter<T extends Function, F>(hook: ObjectHook<T, { filter?: F }> | undefined) {
  return hook && 'filter' in hook && hook.filter ? hook.filter : undefined
}

// ---

// Same as `@rollup/plugin-alias` default resolver, but we attach additional meta
// if we can't resolve to something, which will error in `importAnalysis`
export const viteAliasCustomResolver: ResolverFunction = async function (
  // @ts-expect-error -- FIXME(kazupon): types
  id,
  // @ts-expect-error -- FIXME(kazupon): types
  importer,
  // @ts-expect-error -- FIXME(kazupon): types
  options
) {
  // @ts-expect-error -- FIXME(kazupon): types
  const resolved = await this.resolve(id, importer, options)
  return resolved || { id, meta: { 'vite:alias': { noResolved: true } } }
}
