import type { ResolverFunction } from '@rollup/plugin-alias'
import type { ObjectHook } from 'rolldown'
import type { PluginHookUtils, ResolvedConfig } from '../config'
import type {
  HookHandler,
  Plugin,
  PluginWithRequiredHook,
} from '../plugin'
import type { PluginFilter, TransformHookFilter } from './pluginFilter'
import {
  createFilterForTransform,
  createIdFilter,
} from './pluginFilter'

export async function resolvePlugins(
  config: ResolvedConfig,
  prePlugins: Plugin[],
  normalPlugins: Plugin[],
  postPlugins: Plugin[],
): Promise<Plugin[]> {
  const isBuild = config.command === 'build'
  const isBundled = config.isBundled
  const isWorker = config.isWorker
  const buildPlugins = isBundled
    ? await (await import('../build')).resolveBuildPlugins(config)
    : { pre: [], post: [] }
  const { modulePreload } = config.build
  const enableNativePlugin = config.nativePluginEnabledLevel >= 0
  const enableNativePluginV1 = config.nativePluginEnabledLevel >= 1

  if (__VROWZER_SERVICE_WORKER__) {
    return [
      ...prePlugins,
      ...normalPlugins,
      ...postPlugins,
    ].filter(Boolean) as Plugin[]
  } else {
    // Transform pipeline plugins: only loaded for Web Worker (not Service Worker).
    // In Service Worker, all transform operations are delegated to Web Worker via birpc RPC.
    // Using dynamic import() guarded by __VROWZER_SERVICE_WORKER__ build-time constant
    // enables rolldown DCE(Dead Code Elimination) to eliminate these plugins and their heavy dependencies
    // (postcss, oxc-parser, es-module-lexer, etc.) from the Service Worker bundle.
    const [preAliasMod, aliasMod, resolveMod, htmlMod, cssMod, oxcMod, jsonMod, importAnalysisMod, assetMod, clientInjectionsMod] = await Promise.all([
      import('./preAlias'),
      import('@rollup/plugin-alias'),
      import('./resolve'),
      import('./html'),
      import('./css'),
      import('./oxc'),
      import('./json'),
      import('./importAnalysis'),
      import('./asset'),
      import('./clientInjections'),
    ])
    const preAliasPlugin = preAliasMod.preAliasPlugin
    const aliasPlugin = aliasMod.default
    const resolvePlugin = resolveMod.resolvePlugin
    const htmlInlineProxyPlugin = htmlMod.htmlInlineProxyPlugin
    const cssPlugin = cssMod.cssPlugin
    const cssPostPlugin = cssMod.cssPostPlugin
    const cssAnalysisPlugin = cssMod.cssAnalysisPlugin
    const oxcPlugin = oxcMod.oxcPlugin
    const jsonPlugin = jsonMod.jsonPlugin
    const importAnalysisPlugin = importAnalysisMod.importAnalysisPlugin
    const assetPlugin = assetMod.assetPlugin
    const clientInjectionsPlugin = clientInjectionsMod.clientInjectionsPlugin

    return [
      // !isBundled ? optimizedDepsPlugin() : null,
      // !isWorker ? watchPackageDataPlugin(config.packageCache) : null,
      !isBundled && preAliasPlugin(config),
      aliasPlugin({
        // @ts-expect-error aliasPlugin receives rollup types
        entries: config.resolve.alias,
        customResolver: viteAliasCustomResolver,
      }),

      ...prePlugins,

      resolvePlugin({
        root: config.root,
        isProduction: config.isProduction,
        isBuild,
        packageCache: config.packageCache,
        asSrc: true,
        optimizeDeps: true,
        externalize: true,
      }),
      htmlInlineProxyPlugin(config),
      cssPlugin(config),
      // esbuildBannerFooterCompatPlugin(config),
      config.oxc !== false && oxcPlugin(config),
      jsonPlugin(config.json, isBuild, enableNativePluginV1),
      // wasmHelperPlugin(config),
      // webWorkerPlugin(config),
      assetPlugin(config),

      ...normalPlugins,

      // wasmFallbackPlugin(config),
      // definePlugin(config),
      cssPostPlugin(config),
      // isBundled && buildHtmlPlugin(config),
      // workerImportMetaUrlPlugin(config),
      // assetImportMetaUrlPlugin(config),
      // ...buildPlugins.pre,
      // dynamicImportVarsPlugin(config),
      // importGlobPlugin(config),

      ...postPlugins,

      ...buildPlugins.post,

      // internal server-only plugins are always applied after everything else
      ...(isBundled
        ? []
        : [
          clientInjectionsPlugin(config),
          cssAnalysisPlugin(config),
          importAnalysisPlugin(config)
        ]),
    ].filter(Boolean) as Plugin[]
  }
}

export function createPluginHookUtils(
  plugins: readonly Plugin[],
): PluginHookUtils {
  // sort plugins per hook
  const sortedPluginsCache = new Map<keyof Plugin, Plugin[]>()
  function getSortedPlugins<K extends keyof Plugin>(
    hookName: K,
  ): PluginWithRequiredHook<K>[] {
    if (sortedPluginsCache.has(hookName)) { return sortedPluginsCache.get(hookName) as PluginWithRequiredHook<K>[] }
    const sorted = getSortedPluginsByHook(hookName, plugins)
    sortedPluginsCache.set(hookName, sorted)
    return sorted
  }
  function getSortedPluginHooks<K extends keyof Plugin>(
    hookName: K,
  ): NonNullable<HookHandler<Plugin[K]>>[] {
    const plugins = getSortedPlugins(hookName)
    return plugins.map((p) => getHookHandler(p[hookName])).filter(Boolean)
  }

  return {
    getSortedPlugins,
    getSortedPluginHooks,
  }
}

export function getSortedPluginsByHook<K extends keyof Plugin>(
  hookName: K,
  plugins: readonly Plugin[],
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

  return sortedPlugins as PluginWithRequiredHook<K>[]
}

export function getHookHandler<T extends ObjectHook<Function>>(
  hook: T,
): HookHandler<T> {
  return (typeof hook === 'object' ? hook.handler : hook) as HookHandler<T>
}

type FilterForPluginValue = {
  resolveId?: PluginFilter | undefined
  load?: PluginFilter | undefined
  transform?: TransformHookFilter | undefined
}
const filterForPlugin = new WeakMap<Plugin, FilterForPluginValue>()

export function getCachedFilterForPlugin<
  H extends 'resolveId' | 'load' | 'transform',
>(plugin: Plugin, hookName: H): FilterForPluginValue[H] | undefined {
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
        rawFilters?.moduleType,
      )
      filter = filters.transform
      break
    }
  }
  return filter as FilterForPluginValue[H] | undefined
}

function extractFilter<T extends Function, F>(
  hook: ObjectHook<T, { filter?: F }> | undefined,
) {
  return hook && 'filter' in hook && hook.filter ? hook.filter : undefined
}

// Same as `@rollup/plugin-alias` default resolver, but we attach additional meta
// if we can't resolve to something, which will error in `importAnalysis`
export const viteAliasCustomResolver: ResolverFunction = async function (
  id,
  importer,
  options,
) {
  const resolved = await this.resolve(id, importer, options)
  return resolved || { id, meta: { 'vite:alias': { noResolved: true } } }
}
