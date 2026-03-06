/**
 * vite-plugin-vrowser entry
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import inject from '@rollup/plugin-inject'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { corePlugin } from './core.ts'
import { resolveOptions } from './options.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'
import { generateServiceWorkerEntry, generateWebWorkerEntry } from './virtual.ts'

import type { Plugin } from 'vite'
import type { VrowserOptions } from './options.ts'

const CONFIG_FILE_NAMES = [
  'vrowser.config.ts',
  'vrowser.config.js',
  'vrowser.config.mts',
  'vrowser.config.mjs'
]

/**
 * Detect vrowser config file in the project root.
 */
function detectConfigFile(root: string, configFile?: string): string | null {
  if (configFile) {
    const abs = resolve(root, configFile)
    return existsSync(abs) ? abs : null
  }
  for (const name of CONFIG_FILE_NAMES) {
    const abs = resolve(root, name)
    if (existsSync(abs)) {
      return abs
    }
  }
  return null
}

export function Vrowser(options: VrowserOptions = {}): Plugin[] {
  const resolvedOptions = resolveOptions(options)

  // Detect vrowser.config.ts early (at plugin creation time)
  const root = process.cwd()
  const vrowserConfigPath = detectConfigFile(root, resolvedOptions.configFile || undefined)

  // Reusable transform function for injecting vrowser.config.ts plugins into Worker entries
  function webWorkerEntryTransform(code: string, id: string) {
    if (!vrowserConfigPath) {
      return
    }
    const cleanId = id.split('?')[0]
    if (
      cleanId?.endsWith('web-worker.ts') &&
      !cleanId.endsWith('web-worker-core.ts') &&
      code.includes('initWebWorker()')
    ) {
      return { code: generateWebWorkerEntry(vrowserConfigPath), map: null }
    }
    if (
      cleanId?.endsWith('service-worker.ts') &&
      !cleanId.endsWith('service-worker-core.ts') &&
      code.includes('initServiceWorker()')
    ) {
      return { code: generateServiceWorkerEntry(vrowserConfigPath), map: null }
    }
  }

  const vrowserConfigPlugin: Plugin = {
    name: 'vrowser:config',
    config() {
      if (!vrowserConfigPath) {
        return
      }
      // Add Web Worker transform to worker.plugins so it applies during Vite's Worker bundling (build mode)
      return {
        worker: {
          plugins: () => [
            {
              name: 'vrowser:web-worker-config-inject',
              transform: webWorkerEntryTransform
            }
          ]
        }
      }
    },
    // Transform for dev mode (Vite serves Worker modules through the main pipeline)
    transform: webWorkerEntryTransform
  }

  return [
    vrowserConfigPlugin,
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
      ...(resolvedOptions.serviceWorkerEntry ? { entry: resolvedOptions.serviceWorkerEntry } : {}),
      // Pass Service Worker transform plugin directly to unplugin-service-worker's bundler
      // to inject user plugins from vrowser.config.ts into the Service Worker entry
      ...(vrowserConfigPath
        ? {
            plugins: [
              {
                name: 'vrowser:sw-config-inject',
                transform(code: string, id: string) {
                  const cleanId = id.split('?')[0]
                  if (
                    cleanId.endsWith('service-worker.ts') &&
                    !cleanId.endsWith('service-worker-core.ts') &&
                    code.includes('initServiceWorker()')
                  ) {
                    return {
                      code: generateServiceWorkerEntry(vrowserConfigPath!),
                      map: null
                    }
                  }
                }
              }
            ]
          }
        : {})
    })
  ]
}
