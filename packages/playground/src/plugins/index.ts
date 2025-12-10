import { createFilterForTransform, createIdFilter } from './pluginFilter.ts'

import type { ObjectHook } from '@rolldown/browser'
import type { Plugin } from 'vite'
import type { PluginHookUtils } from '../config.ts'
import type { HookHandler, PluginWithRequiredHook } from '../plugin.ts'
import type { PluginFilter, TransformHookFilter } from './pluginFilter.ts'

// ---

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
    // @ts-expect-error -- FIXME(kazupon): types
    sortedPluginsCache.set(hookName, sorted)
    return sorted
  }
  function getSortedPluginHooks<K extends keyof Plugin>(
    hookName: K
  ): NonNullable<HookHandler<Plugin[K]>>[] {
    const plugins = getSortedPlugins(hookName)
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
