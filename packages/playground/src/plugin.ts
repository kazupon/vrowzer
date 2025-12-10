import type { ObjectHook, Plugin } from '@rolldown/browser'

export type HookHandler<T> = T extends ObjectHook<infer H> ? H : T

export type PluginWithRequiredHook<K extends keyof Plugin> = Plugin & {
  [P in K]: NonNullable<Plugin[P]>
}

type Thenable<T> = T | Promise<T>

export type FalsyPlugin = false | null | undefined

export type PluginOption = Thenable<
  | Plugin
  | { name: string } // for rollup plugin compatibility
  | FalsyPlugin
  | PluginOption[]
>
