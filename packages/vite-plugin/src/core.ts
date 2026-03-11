/**
 * core plugin
 *
 * @module core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createDebug } from 'obug'

import type { Plugin } from 'vite'
import type { ResolvedVrowserOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:core')

// Resolve picocolors browser version path.
// picocolors doesn't export the browser file via package.json exports,
// so we use createRequire to find the package and construct the path.
const _require = createRequire(import.meta.url)
const picocolorsBrowser = resolve(dirname(_require.resolve('picocolors')), 'picocolors.browser.js')

export function corePlugin(_options: ResolvedVrowserOptions): Plugin {
  return {
    name: 'vrowser:core',
    // Rolldown native inject: inject `process` global for browser/Worker environments.
    // This replaces bare `process` references with an import from the polyfill.
    options(inputOptions) {
      inputOptions.transform ??= {}
      ;(inputOptions.transform as Record<string, unknown>).inject = {
        ...(((inputOptions.transform as Record<string, unknown>).inject as Record<
          string,
          string
        >) ?? {}),
        process: '@vrowser/node-polyfill/process'
      }
      debug('options hook: inputOptions.transform.inject ', inputOptions.transform.inject)
    },
    config(_config, _env) {
      return {
        define: {
          'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
        },
        resolve: {
          alias: {
            'node:events': '@vrowser/node-polyfill/events',
            'node:path': 'pathe',
            'node:stream': 'readable-stream/lib/stream',
            'node:buffer': 'buffer',
            'node:dns': '@vrowser/node-polyfill/dns',
            'node:fs': '@vrowser/fs',
            'node:fs/promises': '@vrowser/fs/promises',
            'node:url': '@vrowser/node-polyfill/url',
            'node:readline': '@vrowser/node-polyfill/readline',
            'node:util': '@vrowser/node-polyfill/util',
            'node:perf_hooks': '@vrowser/node-polyfill/perf_hooks',
            'node:crypto': '@vrowser/node-polyfill/crypto',
            'node:tty': '@vrowser/node-polyfill/tty',
            'node:module': '@vrowser/node-polyfill/module',
            'node:os': '@vrowser/node-polyfill/os',
            'node:net': '@vrowser/node-polyfill/net',
            buffer: 'buffer',
            dns: '@vrowser/node-polyfill/dns',
            events: '@vrowser/node-polyfill/events',
            path: 'pathe',
            stream: 'readable-stream/lib/stream',
            readline: '@vrowser/node-polyfill/readline',
            util: '@vrowser/node-polyfill/util',
            perf_hooks: '@vrowser/node-polyfill/perf_hooks',
            // NOTE(kazupon):
            // required('process/`) at `readable-stream/lib/internal/streams/pipeline.js:3:25` ...
            'process/': '@vrowser/node-polyfill/process',
            process: '@vrowser/node-polyfill/process',
            fs: '@vrowser/fs',
            'fs/promises': '@vrowser/fs/promises',
            url: '@vrowser/node-polyfill/url',
            crypto: '@vrowser/node-polyfill/crypto',
            tty: '@vrowser/node-polyfill/tty',
            module: '@vrowser/node-polyfill/module',
            os: '@vrowser/node-polyfill/os',
            net: '@vrowser/node-polyfill/net',
            // picocolors CJS → browser version (no ANSI codes in Worker/SW)
            picocolors: picocolorsBrowser
          }
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
    }
  }
}
