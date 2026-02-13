/**
 * Environment injection adapter for Vite plugins.
 *
 * When Vite plugins are used inside a standalone rolldown bundler (for Service Worker bundling),
 * they expect `this.environment` to be available in hook contexts. This module provides
 * `injectEnvironmentToHooks` which wraps all rollup/rolldown hooks to inject the environment.
 *
 * Based on Vite's `injectEnvironmentToHooks` in `packages/vite/src/node/build.ts`.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Plugin } from 'rolldown'

/**
 * Vite Environment interface (minimal subset needed for hook injection).
 * Using `unknown` to avoid depending on vite types directly.
 */
type Environment = unknown

/**
 * Rolldown plugin hooks that need environment injection.
 * Based on Vite's ROLLUP_HOOKS constant.
 */
const ROLLDOWN_HOOKS: string[] = [
  'options',
  'buildStart',
  'buildEnd',
  'renderStart',
  'renderError',
  'renderChunk',
  'writeBundle',
  'generateBundle',
  'banner',
  'footer',
  'augmentChunkHash',
  'outputOptions',
  'intro',
  'outro',
  'closeBundle',
  'load',
  'moduleParsed',
  'watchChange',
  'resolveDynamicImport',
  'resolveId',
  'transform',
  'onLog'
]

type ObjectHook<T extends Function> = T | { handler: T; order?: string; filter?: unknown }

/**
 * Get the handler function from a hook (which can be a function or an object with a handler property)
 */

function getHookHandler<T extends Function>(hook: ObjectHook<T>): T {
  if (typeof hook === 'object') {
    return hook.handler
  }
  return hook
}

/**
 * Inject environment into plugin context.
 * Sets `this.environment` on the plugin context so Vite plugins can access it.
 */
function injectEnvironmentInContext<T>(context: T, environment: Environment): T {
  const ctx = context as T & { environment?: Environment }
  ctx.environment ??= environment
  return ctx
}

/**
 * Wrap a hook that can be either a function or an object with handler/filter/order.
 * Preserves the hook's filter and order properties when wrapping.
 */

function wrapHook<T extends Function>(hook: ObjectHook<T>, handler: T): ObjectHook<T> {
  if (typeof hook === 'object') {
    return { ...hook, handler }
  }
  return handler
}

/**
 * Wrap resolveId hook to inject environment
 */
function wrapEnvironmentResolveId(
  environment: Environment,
  hook: Plugin['resolveId'] | undefined
): Plugin['resolveId'] | undefined {
  if (!hook) return undefined

  const fn = getHookHandler(hook as ObjectHook<Function>)
  const handler = function (
    this: unknown,
    id: string,
    importer: string | undefined,
    options: unknown
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- ignore
    return fn.call(injectEnvironmentInContext(this, environment), id, importer, options)
  }

  return wrapHook(hook as ObjectHook<typeof handler>, handler) as Plugin['resolveId']
}

/**
 * Wrap load hook to inject environment
 */
function wrapEnvironmentLoad(
  environment: Environment,
  hook: Plugin['load'] | undefined
): Plugin['load'] | undefined {
  if (!hook) return undefined

  const fn = getHookHandler(hook as ObjectHook<Function>)
  const handler = function (this: unknown, id: string, ...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- ignore
    return fn.call(injectEnvironmentInContext(this, environment), id, ...args)
  }

  return wrapHook(hook as ObjectHook<typeof handler>, handler) as Plugin['load']
}

/**
 * Wrap transform hook to inject environment
 */
function wrapEnvironmentTransform(
  environment: Environment,
  hook: Plugin['transform'] | undefined
): Plugin['transform'] | undefined {
  if (!hook) return undefined

  const fn = getHookHandler(hook as ObjectHook<Function>)
  const handler = function (this: unknown, code: string, id: string, ...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- ignore
    return fn.call(injectEnvironmentInContext(this, environment), code, id, ...args)
  }

  return wrapHook(hook as ObjectHook<typeof handler>, handler) as Plugin['transform']
}

/**
 * Wrap a generic hook to inject environment
 */
function wrapEnvironmentHook(environment: Environment, plugin: Plugin, hookName: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ignore
  const hook = (plugin as any)[hookName]
  if (!hook) return undefined

  const fn = getHookHandler(hook as ObjectHook<Function>)
  if (typeof fn !== 'function') return hook

  const handler = function (this: unknown, ...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- ignore
    return fn.call(injectEnvironmentInContext(this, environment), ...args)
  }

  return wrapHook(hook as ObjectHook<typeof handler>, handler)
}

/**
 * Inject environment into all hooks of a plugin.
 *
 * Creates a clone of the plugin with all hooks wrapped to inject `this.environment`
 * into the plugin context. This allows Vite plugins (which expect `this.environment`)
 * to work inside a standalone rolldown bundler.
 *
 * @param environment - The Vite BuildEnvironment instance
 * @param plugin - The plugin to wrap
 * @returns A new plugin with environment-injected hooks
 */
export function injectEnvironmentToHooks(environment: Environment, plugin: Plugin): Plugin {
  const { resolveId, load, transform } = plugin

  // Clone the plugin (supports class instances)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore
  const clone: Plugin = Object.assign(
    Object.create(Object.getPrototypeOf(plugin) as object),
    plugin
  )

  for (const hook of Object.keys(clone)) {
    switch (hook) {
      case 'resolveId': {
        const wrapped = wrapEnvironmentResolveId(environment, resolveId)
        if (wrapped) clone[hook] = wrapped
        break
      }
      case 'load': {
        const wrapped = wrapEnvironmentLoad(environment, load)
        if (wrapped) clone[hook] = wrapped
        break
      }
      case 'transform': {
        const wrapped = wrapEnvironmentTransform(environment, transform)
        if (wrapped) clone[hook] = wrapped
        break
      }
      default:
        if (ROLLDOWN_HOOKS.includes(hook)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ignore
          ;(clone as any)[hook] = wrapEnvironmentHook(environment, plugin, hook)
        }
        break
    }
  }

  return clone
}
