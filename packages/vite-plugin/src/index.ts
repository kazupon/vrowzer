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
import { generateWebWorkerEntry } from './virtual.ts'

import type { Plugin, UserConfig } from 'vite'
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

  // Transform function for injecting vrowser.config.ts plugins into WW entry
  function workerEntryTransform(code: string, id: string) {
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
  }

  const vrowserConfigPlugin: Plugin = {
    name: 'vrowser:config',
    config(): UserConfig {
      const workerPlugins: Plugin[] = [
        // Inject `process` polyfill into Worker bundle.
        // In dev mode, @rollup/plugin-inject handles this in the main pipeline.
        // In build mode, corePlugin's options hook sets transform.inject for the main build,
        // but Worker bundling runs a separate rolldown instance that doesn't inherit user plugins.
        // This worker plugin ensures the inject is applied in the Worker build as well.
        {
          name: 'vrowser:worker-process-inject',
          options(inputOptions: any) {
            inputOptions.transform ??= {}
            inputOptions.transform.inject = {
              ...inputOptions.transform.inject,
              process: '@vrowser/node-polyfill/process'
            }
          }
        }
      ]

      // In build mode, Worker entries are bundled by Vite's `bundleWorkerEntry` which uses
      // worker.plugins. The WW entry transform (injecting vrowser.config.ts) must be included here.
      if (vrowserConfigPath) {
        workerPlugins.push({
          name: 'vrowser:web-worker-config-inject',
          transform: workerEntryTransform
        })
      }

      return {
        // Resolve bare "vite" imports to @vrowser/vite-dev-server/vite.
        // Ecosystem plugins (e.g. @vitejs/plugin-vue) import from "vite" which pulls in
        // lightningcss native bindings. Using resolve.alias ensures this applies to both
        // the main build pipeline and Worker bundling (Vite inherits resolve.alias for workers).
        // The regex ensures only exact "vite" is matched, preserving "vite/modulepreload-polyfill".
        resolve: {
          alias: [{ find: /^vite$/, replacement: '@vrowser/vite-dev-server/vite' }]
        },
        worker: {
          plugins: () => workerPlugins
        }
      }
    },
    // Transform for dev mode (Vite serves Worker modules through the main pipeline)
    transform(code: string, id: string) {
      return workerEntryTransform(code, id)
    }
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
      ...(resolvedOptions.serviceWorkerEntry ? { entry: resolvedOptions.serviceWorkerEntry } : {})
    })
  ]
}
