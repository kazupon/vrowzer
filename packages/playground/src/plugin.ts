import { arraify, asyncFlatten } from './utils.ts'

import type { MinimalPluginContext, ObjectHook, PluginContextMeta } from '@rolldown/browser'
import type { PartialEnvironment } from './baseEnvironment.ts'
import type { Environment } from './ssr/environment.ts'

/**
 * Vite plugins extends the Rollup plugin interface with a few extra
 * vite-specific options. A valid vite plugin is also a valid Rollup plugin.
 * On the contrary, a Rollup plugin may or may NOT be a valid vite universal
 * plugin, since some Rollup features do not make sense in an unbundled
 * dev server context. That said, as long as a rollup plugin doesn't have strong
 * coupling between its bundle phase and output phase hooks then it should
 * just work (that means, most of them).
 *
 * By default, the plugins are run during both serve and build. When a plugin
 * is applied during serve, it will only run **non output plugin hooks** (see
 * rollup type definition of {@link rollup#PluginHooks}). You can think of the
 * dev server as only running `const bundle = rollup.rollup()` but never calling
 * `bundle.generate()`.
 *
 * A plugin that expects to have different behavior depending on serve/build can
 * export a factory function that receives the command being run via options.
 *
 * If a plugin should be applied only for server or build, a function format
 * config file can be used to conditional determine the plugins to use.
 *
 * The current environment can be accessed from the context for the all non-global
 * hooks (it is not available in config, configResolved, configureServer, etc).
 * It can be a dev, build, or scan environment.
 * Plugins can use this.environment.mode === 'dev' to guard for dev specific APIs.
 */

export interface PluginContextExtension {
  /**
   * Vite-specific environment instance
   */
  environment: Environment
}

export interface PluginContextMetaExtension {
  viteVersion: string
}

export interface ConfigPluginContext extends Omit<MinimalPluginContext, 'meta' | 'environment'> {
  meta: Omit<PluginContextMeta, 'watchMode'>
}

export interface MinimalPluginContextWithoutEnvironment extends Omit<
  MinimalPluginContext,
  'environment'
> {}

// Augment Rolldown types to have the PluginContextExtension
declare module '@rolldown/browser' {
  export interface MinimalPluginContext extends PluginContextExtension {}
  export interface PluginContextMeta extends PluginContextMetaExtension {}
}

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
