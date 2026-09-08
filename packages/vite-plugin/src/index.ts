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
import { dirname, resolve } from 'node:path'
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
import { rolldownPlugin, rolldownWorkerAssetPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'
import { generateWebWorkerEntry } from './virtual.ts'
import { beginWorkerConfigWatch, closeWorkerConfigWatch } from './worker-config-watch.ts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { RollupInjectOptions } from '@rollup/plugin-inject'
import type { VrowzerOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowzer:index')
const inject = injectModule.default as unknown as (
  options?: RollupInjectOptions
) => Record<string, unknown>

export function Vrowzer(options: VrowzerOptions = {}): Plugin[] {
  const resolvedOptions = resolveOptions(options)
  let configRoot = process.cwd()

  // Path to bundled Worker config (set by configResolved)
  let bundledConfigPath: string | null = null
  let isBuild = false
  let configWatch: ReturnType<typeof beginWorkerConfigWatch> | undefined

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
        },
        rolldownWorkerAssetPlugin()
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
      configRoot = config.root

      if (resolvedOptions.workerConfig !== undefined && config.build.watch) {
        throw new Error(
          '[vrowzer] workerConfig does not support build watch. Use a normal build or the dev server.'
        )
      }
      if (!resolvedOptions.extract && resolvedOptions.resolve !== undefined) {
        config.logger.warn(
          '[vrowzer] Vrowzer({ resolve }) is deprecated when host config extraction is disabled. ' +
            'Move resolve to the file specified by workerConfig and remove the legacy option. ' +
            'For compatibility, the legacy option still replaces the entire Worker resolve configuration when provided.'
        )
      }

      const viteConfigPath = config.configFile
      if (resolvedOptions.extract && !viteConfigPath) {
        debug('no vite.config.ts found, skipping extraction')
        return
      }

      const configDir = viteConfigPath ? dirname(viteConfigPath) : config.root
      let workerSource = 'export default { plugins: [] }'
      if (resolvedOptions.extract && viteConfigPath) {
        debug('extracting worker config from:', viteConfigPath)
        const viteConfigSource = readFileSync(viteConfigPath, 'utf-8')
        const { code, unsupported } = extractWorkerConfig(viteConfigSource, viteConfigPath, {
          serverOrigin: config.server.origin,
          serverForwardConsole: config.server.forwardConsole
        })
        workerSource = code
        if (unsupported.length > 0) {
          debug('unsupported patterns found:', unsupported)
        }
      }

      debug('generated worker source:\n', workerSource)

      configWatch =
        !isBuild && resolvedOptions.workerConfig !== undefined
          ? beginWorkerConfigWatch(config)
          : undefined
      const bundled = await prebundleWorkerConfig({
        ...(resolvedOptions.workerConfig !== undefined
          ? { workerConfig: resolve(configDir, resolvedOptions.workerConfig) }
          : {
              workerSource,
              ...(resolvedOptions.extract && viteConfigPath ? { sourcePath: viteConfigPath } : {})
            }),
        root: config.root,
        configDir,
        ...(configWatch ? { onDependency: configWatch.onDependency } : {})
      }).finally(() => configWatch?.finish())
      bundledConfigPath = bundled.path

      debug('bundled config path:', bundledConfigPath)
    },
    configureServer(server) {
      configWatch?.connect(server)
    },
    closeBundle() {
      if (isBuild && bundledConfigPath) {
        cleanOutputDir(configRoot)
        debug('cleaned up prebundle output after build')
      } else if (this.environment?.mode === 'dev') {
        // Dependency scanning also calls closeBundle, but does not close the host server.
        closeWorkerConfigWatch(this.environment.getTopLevelConfig())
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
