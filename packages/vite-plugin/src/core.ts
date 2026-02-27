/**
 * core plugin
 *
 * @module core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createDebug } from 'obug'

import type { Plugin } from 'vite'
import type { ResolvedVrowserPluginOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:core')

export function corePlugin(options: ResolvedVrowserPluginOptions): Plugin {
  return {
    name: 'vrowser:core',
    config(config, env) {
      // TODO(kazupon): need to inject polyfill with rolldown builtin inject feature?
      // inject({
      //   process: '@vrowser/node-polyfill/process'
      // }),
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
            url: '@vrowser/node-polyfill/url'
          }
        },
        worker: {
          format: 'es'
        },
        server: {
          headers: {
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
