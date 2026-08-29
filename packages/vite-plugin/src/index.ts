/**
 * vite-plugin-vrowzer entry
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as injectModule from '@rollup/plugin-inject'
import ServiceWorker from '@vrowzer/unplugin-service-worker/vite'
import { createDebug } from 'obug'
import { autoManifestPlugin } from './auto-manifest.ts'
import { envPlugin } from './env.ts'
import { idePlugin } from './ide.ts'
import { extractWorkerConfig } from './extract.ts'
import { resolveOptions } from './options.ts'
import { cleanOutputDir, prebundleWorkerConfig } from './prebundle.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'
import { generateWebWorkerEntry } from './virtual.ts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { RollupInjectOptions } from '@rollup/plugin-inject'
import type { VrowzerOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowzer:index')
const inject = injectModule.default as unknown as (
  options?: RollupInjectOptions
) => Record<string, unknown>

export function Vrowzer(options: VrowzerOptions = {}): Plugin[] {
  const resolvedOptions = resolveOptions(options)
  const root = process.cwd()

  // Path to bundled Worker config (set by configResolved)
  let bundledConfigPath: string | null = null
  let isBuild = false

  function workerEntryTransform(code: string, id: string) {
    if (!bundledConfigPath) {
      return
    }
    const cleanId = id.split('?')[0]
    if (
      cleanId?.endsWith('web-worker.ts') &&
      !cleanId.endsWith('web-worker-core.ts') &&
      code.includes('initWebWorker()')
    ) {
      return { code: generateWebWorkerEntry(bundledConfigPath, resolvedOptions.resolve), map: null }
    }
  }

  const vrowzerConfigPlugin: Plugin = {
    name: 'vrowzer:config',
    resolveId(id) {
      if (id.startsWith('@vrowzer/')) {
        try {
          return fileURLToPath(import.meta.resolve(id))
        } catch {
          // Not resolvable from this plugin — let Vite handle it normally
        }
      }
    },
    config(): UserConfig {
      const workerPlugins: Plugin[] = [
        {
          name: 'vrowzer:worker-resolve',
          resolveId(id: string) {
            if (id.startsWith('@vrowzer/')) {
              try {
                return fileURLToPath(import.meta.resolve(id))
              } catch {
                // fallthrough
              }
            }
          }
        },
        {
          name: 'vrowzer:worker-process-inject',
          options(inputOptions: any) {
            inputOptions.transform ??= {}
            inputOptions.transform.inject = {
              ...inputOptions.transform.inject,
              process: '@vrowzer/node-polyfill/process'
            }
          }
        },
        {
          name: 'vrowzer:web-worker-config-inject',
          transform: workerEntryTransform
        }
      ]

      return {
        optimizeDeps: {
          exclude: ['@vrowzer/vite-dev-server']
        },
        resolve: {
          alias: [{ find: /^vite$/, replacement: '@vrowzer/vite-dev-server/vite' }]
        },
        worker: {
          plugins: () => workerPlugins
        }
      }
    },
    async configResolved(config: ResolvedConfig) {
      isBuild = config.command === 'build'

      const viteConfigPath = config.configFile
      if (!viteConfigPath) {
        debug('no vite.config.ts found, skipping extraction')
        return
      }

      debug('extracting worker config from:', viteConfigPath)

      cleanOutputDir(config.root)

      const configDir = dirname(viteConfigPath)
      const viteConfigSource = readFileSync(viteConfigPath, 'utf-8')
      const { code: workerSource, unsupported } = extractWorkerConfig(
        viteConfigSource,
        viteConfigPath,
        {
          serverOrigin: config.server.origin,
          serverForwardConsole: config.server.forwardConsole
        }
      )

      if (unsupported.length > 0) {
        debug('unsupported patterns found:', unsupported)
      }

      debug('generated worker source:\n', workerSource)

      bundledConfigPath = await prebundleWorkerConfig({
        workerSource,
        root: config.root,
        configDir
      })

      debug('bundled config path:', bundledConfigPath)
    },
    closeBundle() {
      if (isBuild && bundledConfigPath) {
        cleanOutputDir(root)
        debug('cleaned up prebundle output after build')
      }
    },
    transform(code: string, id: string) {
      return workerEntryTransform(code, id)
    }
  }

  const processInjectPlugin = {
    ...inject({
      process: '@vrowzer/node-polyfill/process',
      exclude: [/node_modules\/\.vite\//, /node_modules\/\.vrowzer\//]
    }),
    apply: 'serve'
  } as unknown as Plugin
  const serviceWorkerPlugin = ServiceWorker({
    serviceWorkerAllowed: resolvedOptions.serviceWorkerScope,
    format: 'esm',
    ...(resolvedOptions.serviceWorkerEntry ? { entry: resolvedOptions.serviceWorkerEntry } : {})
  }) as unknown as Plugin

  const plugins: Plugin[] = [
    vrowzerConfigPlugin,
    serverMiddlewarePlugin(resolvedOptions),
    processInjectPlugin,
    envPlugin(resolvedOptions),
    rolldownPlugin(resolvedOptions),
    serviceWorkerPlugin
  ]

  // Auto-manifest plugin: generates manifest and provides virtual:vrowzer-manifest
  if (resolvedOptions.auto) {
    plugins.unshift(autoManifestPlugin(resolvedOptions.manifest))
  }

  // IDE plugin: serves browser IDE at /__vrowzer__/ (experimental)
  if (resolvedOptions.ide.enabled) {
    plugins.push(idePlugin(resolvedOptions))
  }

  return plugins
}

export { VrowzerManifest } from './manifest.ts'
export { generateManifest } from './manifest-generate.ts'
export type {
  GenerateManifestOptions,
  ManifestResult,
  GenerateManifestLog
} from './manifest-generate.ts'
