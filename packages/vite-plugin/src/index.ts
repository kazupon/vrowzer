/**
 * vite-plugin-vrowser entry
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import inject from '@rollup/plugin-inject'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { createDebug } from 'obug'
import { corePlugin } from './core.ts'
import { extractWorkerConfig } from './extract.ts'
import { resolveOptions } from './options.ts'
import { cleanOutputDir, prebundleWorkerConfig } from './prebundle.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'
import { generateWebWorkerEntry } from './virtual.ts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { VrowserOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:index')

const WORKER_CONFIG_FILE_NAMES = [
  'vrowser.config.ts',
  'vrowser.config.js',
  'vrowser.config.mts',
  'vrowser.config.mjs'
]

/**
 * Detect vrowser config file (legacy) in the project root.
 */
function detectWorkerConfigFile(root: string, workerConfig?: string): string | null {
  if (workerConfig) {
    const abs = resolve(root, workerConfig)
    return existsSync(abs) ? abs : null
  }
  for (const name of WORKER_CONFIG_FILE_NAMES) {
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
  const legacyConfigPath = detectWorkerConfigFile(root, resolvedOptions.workerConfig || undefined)

  // Path to bundled Worker config (set by configResolved when extracting from vite.config.ts)
  let bundledConfigPath: string | null = null
  // Whether we're using the new extraction mode (vs legacy vrowser.config.ts)
  const useExtraction = !legacyConfigPath
  // Track if we're in build mode (set in configResolved)
  let isBuild = false

  // Transform function for injecting Worker config into WW entry
  function workerEntryTransform(code: string, id: string) {
    const configPath = bundledConfigPath || legacyConfigPath
    if (!configPath) {
      return
    }
    const cleanId = id.split('?')[0]
    if (
      cleanId?.endsWith('web-worker.ts') &&
      !cleanId.endsWith('web-worker-core.ts') &&
      code.includes('initWebWorker()')
    ) {
      return { code: generateWebWorkerEntry(configPath, resolvedOptions.resolve), map: null }
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
      // worker.plugins. The WW entry transform must be included here.
      // Always push the transform plugin — it checks configPath internally.
      workerPlugins.push({
        name: 'vrowser:web-worker-config-inject',
        transform: workerEntryTransform
      })

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
    async configResolved(config: ResolvedConfig) {
      isBuild = config.command === 'build'

      if (!useExtraction) {
        debug('using legacy vrowser.config.ts:', legacyConfigPath)
        return
      }

      // Extract plugins from vite.config.ts
      const viteConfigPath = config.configFile
      if (!viteConfigPath) {
        debug('no vite.config.ts found, skipping extraction')
        return
      }

      debug('extracting worker config from:', viteConfigPath)

      // Always start fresh — remove previous prebundle output
      cleanOutputDir(config.root)

      const configDir = dirname(viteConfigPath)
      const viteConfigSource = readFileSync(viteConfigPath, 'utf-8')
      const { code: workerSource, unsupported } = extractWorkerConfig(
        viteConfigSource,
        viteConfigPath
      )

      if (unsupported.length > 0) {
        debug('unsupported patterns found:', unsupported)
      }

      debug('generated worker source:\n', workerSource)

      // Pre-bundle with rolldown
      bundledConfigPath = await prebundleWorkerConfig({
        workerSource,
        root: config.root,
        configDir
      })

      debug('bundled config path:', bundledConfigPath)
    },
    // In build mode, clean up prebundle output after the build completes.
    // In dev mode the files must remain for serving to the browser.
    closeBundle() {
      if (isBuild && useExtraction && bundledConfigPath) {
        cleanOutputDir(root)
        debug('cleaned up prebundle output after build')
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
        exclude: [/node_modules\/\.vite\//, /node_modules\/\.vrowser\//]
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
