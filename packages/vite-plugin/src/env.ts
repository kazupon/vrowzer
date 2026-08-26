/**
 * Environment plugin — Node.js polyfills, CORS headers, and Worker config
 * for browser/Worker environments.
 *
 * @module env
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDebug } from 'obug'
import { resolveAliases } from './alias.ts'

import type { Plugin, ResolvedConfig } from 'vite'
import type { ResolvedVrowzerOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowzer:env')
export const VROWZER_PREVIEW_BASE_PATH_DEFINE = '__VROWZER_INTERNAL_PREVIEW_BASE_PATH__'

// Resolve picocolors browser version path.
// picocolors doesn't export the browser file via package.json exports,
// so we resolve its entry point and construct the path.
const picocolorsBrowser = resolve(
  dirname(fileURLToPath(import.meta.resolve('picocolors'))),
  'picocolors.browser.js'
)

export function envPlugin(options: ResolvedVrowzerOptions): Plugin {
  const serializedBasePath = JSON.stringify(options.basePath)
  return {
    name: 'vrowzer:env',
    // Rolldown native inject: inject `process` global for browser/Worker environments.
    // This replaces bare `process` references with an import from the polyfill.
    options(inputOptions) {
      inputOptions.transform ??= {}
      ;(inputOptions.transform as Record<string, unknown>).inject = {
        ...(((inputOptions.transform as Record<string, unknown>).inject as Record<
          string,
          string
        >) ?? {}),
        process: '@vrowzer/node-polyfill/process'
      }
      debug('options hook: inputOptions.transform.inject ', inputOptions.transform.inject)
    },
    config(_config, _env) {
      return {
        define: {
          'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || ''),
          [VROWZER_PREVIEW_BASE_PATH_DEFINE]: serializedBasePath
        },
        resolve: {
          alias: resolveAliases({
            // process needs both bare and trailing-slash aliases
            // (`require('process/')` in readable-stream/lib/internal/streams/pipeline.js)
            'node:process': '@vrowzer/node-polyfill/process',
            'process/': '@vrowzer/node-polyfill/process',
            process: '@vrowzer/node-polyfill/process',
            // picocolors CJS → browser version (no ANSI codes in Worker/SW)
            picocolors: picocolorsBrowser
          })
        },
        worker: {
          format: 'es'
        },
        server: {
          headers: {
            'Service-Worker-Allowed': '/',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless'
          }
        },
        preview: {
          headers: {
            'Service-Worker-Allowed': '/',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless'
          }
        }
      }
    },
    configResolved(config: ResolvedConfig) {
      const resolvedBasePath = config.define?.[VROWZER_PREVIEW_BASE_PATH_DEFINE]
      if (resolvedBasePath !== serializedBasePath) {
        throw new Error(
          `Vrowzer reserved define ${VROWZER_PREVIEW_BASE_PATH_DEFINE} must be ${serializedBasePath}, received ${JSON.stringify(resolvedBasePath)}`
        )
      }
    }
  }
}
