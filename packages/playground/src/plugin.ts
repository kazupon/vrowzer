import { arraify, asyncFlatten } from './utils.ts'

import type { ObjectHook, Plugin } from '@rolldown/browser'
import type { PartialEnvironment } from './baseEnvironment.ts'

export type HookHandler<T> = T extends ObjectHook<infer H> ? H : T

export type PluginWithRequiredHook<K extends keyof Plugin> = Plugin & {
  [P in K]: NonNullable<Plugin[P]>
}

type Thenable<T> = T | Promise<T>

export type FalsyPlugin = false | null | undefined

type PluginOption = Thenable<
  | Plugin
  | { name: string } // for rollup plugin compatibility
  | FalsyPlugin
  | PluginOption[]
>

export async function resolveEnvironmentPlugins(
  environment: PartialEnvironment
): Promise<Plugin[]> {
  const environmentPlugins: Plugin[] = []
  for (const plugin of environment.getTopLevelConfig().plugins) {
    if (plugin.applyToEnvironment) {
      const applied = await plugin.applyToEnvironment(environment)
      if (!applied) {
        continue
      }
      if (applied !== true) {
        environmentPlugins.push(
          ...((await asyncFlatten(arraify(applied))).filter(Boolean) as Plugin[])
        )
        continue
      }
    }
    // @ts-expect-error -- FIXME(kazupon): types
    environmentPlugins.push(plugin)
  }
  return environmentPlugins
}
