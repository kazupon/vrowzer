/**
 * vite-plugin-vrowser entry
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { corePlugin } from './core.ts'
import { resolveOptions } from './options.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'

import type { Plugin } from 'vite'
import type { VrowserPluginOptions } from './options.ts'

export function VrowserPlugin(options: VrowserPluginOptions = {}): Plugin[] {
  const resolvedOptions = resolveOptions(options)
  return [
    serverMiddlewarePlugin(resolvedOptions),
    corePlugin(resolvedOptions),
    rolldownPlugin(resolvedOptions),
    ServiceWorker({
      serviceWorkerAllowed: '/',
      format: 'esm'
    })
  ]
}
