/**
 * vite-plugin-vrowser entry
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import inject from '@rollup/plugin-inject'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { corePlugin } from './core.ts'
import { resolveOptions } from './options.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'

import type { Plugin } from 'vite'
import type { VrowserOptions } from './options.ts'

export function Vrowser(options: VrowserOptions = {}): Plugin[] {
  const resolvedOptions = resolveOptions(options)
  return [
    serverMiddlewarePlugin(resolvedOptions),
    // In dev mode, @rollup/plugin-inject replaces bare `process` references with polyfill import.
    // In build mode, Rolldown's native transform.inject (in corePlugin) handles this instead.
    // Exclude pre-bundled deps (.vite/deps/) since polyfill can't be resolved from there.
    {
      // @ts-expect-error -- FIXME
      ...inject({
        process: '@vrowser/node-polyfill/process',
        exclude: [/node_modules\/\.vite\//]
      }),
      apply: 'serve'
    } as Plugin,
    corePlugin(resolvedOptions),
    rolldownPlugin(resolvedOptions),
    ServiceWorker({
      serviceWorkerAllowed: '/',
      format: 'esm',
      ...(resolvedOptions.serviceWorkerEntry ? { entry: resolvedOptions.serviceWorkerEntry } : {})
    })
  ]
}
