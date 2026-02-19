import inject from '@rollup/plugin-inject'
import vue from '@vitejs/plugin-vue'
import ServiceWorker, { wasmUrlPlugin } from '@vrowser/unplugin-service-worker/vite'
import { createRequire } from 'node:module'
import path from 'node:path'
import { defineConfig } from 'vite'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const require = createRequire(import.meta.url)

// Resolve @vrowser/rolldown dist paths for dev mode aliases
const rolldownPkgDir = path.dirname(require.resolve('@vrowser/rolldown/package.json'))
const rolldownDistDir = path.resolve(rolldownPkgDir, 'dist')

export default defineConfig({
  plugins: [
    {
      name: 'preview-guard',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Prevent Vite's SPA fallback from serving index.html for /__preview__/ requests.
          // When SW is not yet controlling the page (e.g. after hard reload),
          // __preview__/ requests bypass SW and hit Vite directly.
          // Without this guard, Vite returns the main page HTML, causing recursive display.
          if (req.url?.startsWith('/__preview__')) {
            res.writeHead(503, {
              'Content-Type': 'text/html',
              'Retry-After': '1'
            })
            res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body>
<script>setTimeout(() => location.reload(), 1000)</script>
<p>Waiting for Service Worker...</p></body></html>`)
            return
          }
          next()
        })
      }
    },
    inject({
      process: '@vrowser/node-polyfill/process'
    }),
    vue(),
    ServiceWorker({
      serviceWorkerAllowed: '/',
      plugins: [wasmUrlPlugin()],
      assets: [
        {
          src: path.resolve(
            __dirname,
            './node_modules/@vrowser/oxc-parser/dist/vrowser_oxc_parser_bg.wasm'
          )
        }
      ]
    })
  ],
  define: {
    'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
  resolve: {
    alias: {
      // @vrowser/rolldown aliases - resolve to pre-bundled dist files
      '@vrowser/rolldown/experimental': path.resolve(rolldownDistDir, 'experimental.js'),
      '@vrowser/rolldown': path.resolve(rolldownDistDir, 'index.js'),
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
  optimizeDeps: {
    // @vrowser/rolldown is pre-bundled, skip Vite's dep optimization
    exclude: ['@vrowser/rolldown']
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
})
