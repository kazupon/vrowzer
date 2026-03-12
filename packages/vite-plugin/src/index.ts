/**
 * vite-plugin-vrowser entry
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
import inject from '@rollup/plugin-inject'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { createDebug } from 'obug'
import { envPlugin } from './env.ts'
import { extractWorkerConfig } from './extract.ts'
import { resolveOptions } from './options.ts'
import { cleanOutputDir, prebundleWorkerConfig } from './prebundle.ts'
import { rolldownPlugin } from './rolldown.ts'
import { serverMiddlewarePlugin } from './server.ts'
import { generateWebWorkerEntry } from './virtual.ts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { VrowserOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:index')

export function Vrowser(options: VrowserOptions = {}): Plugin[] {
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

  const vrowserConfigPlugin: Plugin = {
    name: 'vrowser:config',
    resolveId(id) {
      if (id.startsWith('@vrowser/')) {
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
          name: 'vrowser:worker-resolve',
          resolveId(id: string) {
            if (id.startsWith('@vrowser/')) {
              try {
                return fileURLToPath(import.meta.resolve(id))
              } catch {
                // fallthrough
              }
            }
          }
        },
        {
          name: 'vrowser:worker-process-inject',
          options(inputOptions: any) {
            inputOptions.transform ??= {}
            inputOptions.transform.inject = {
              ...inputOptions.transform.inject,
              process: '@vrowser/node-polyfill/process'
            }
          }
        },
        {
          name: 'vrowser:web-worker-config-inject',
          transform: workerEntryTransform
        }
      ]

      return {
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
        viteConfigPath
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

  return [
    vrowserConfigPlugin,
    serverMiddlewarePlugin(resolvedOptions),
    {
      // @ts-expect-error -- FIXME
      ...inject({
        process: '@vrowser/node-polyfill/process',
        exclude: [/node_modules\/\.vite\//, /node_modules\/\.vrowser\//]
      }),
      apply: 'serve'
    } as Plugin,
    envPlugin(resolvedOptions),
    rolldownPlugin(resolvedOptions),
    ServiceWorker({
      serviceWorkerAllowed: '/',
      format: 'esm',
      ...(resolvedOptions.serviceWorkerEntry ? { entry: resolvedOptions.serviceWorkerEntry } : {})
    })
  ]
}

export { VrowserManifest } from './manifest.ts'
