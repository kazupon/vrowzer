import inject from '@rollup/plugin-inject'
import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import type { IncomingMessage, ServerResponse } from 'node:http'

// Resolve @vrowser/rolldown dist path for WASM/Worker file copying
const rolldownDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('@vrowser/rolldown/package.json'))),
  'dist'
)

// Prevent Vite's SPA fallback from serving index.html for /__preview__/ requests.
// When SW is not yet controlling the page (e.g. after hard reload),
// __preview__/ requests bypass SW and hit Vite directly.
// Without this guard, Vite returns the main page HTML, causing recursive display.
function previewGuardMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
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
}

export default defineConfig({
  plugins: [
    {
      name: 'preview-guard',
      configureServer(server) {
        server.middlewares.use(previewGuardMiddleware)
      },
      configurePreviewServer(server) {
        server.middlewares.use(previewGuardMiddleware)
      }
    },
    inject({
      process: '@vrowser/node-polyfill/process'
    }),
    vue(),
    ServiceWorker({
      serviceWorkerAllowed: '/',
      format: 'esm'
    }),
    // Copy rolldown WASM binary and sub-worker for production builds.
    // The Worker chunk is output to dist/assets/ and references WASM via
    // `new URL("./rolldown-binding.wasm32-wasi.wasm", import.meta.url)`,
    // so the WASM file must be in dist/assets/ alongside the Worker chunk.
    {
      name: 'copy-rolldown-wasm',
      writeBundle() {
        const assetsDir = path.resolve(fileURLToPath(import.meta.url), '../dist/assets')
        const wasmSrc = path.resolve(rolldownDistDir, 'rolldown-binding.wasm32-wasi.wasm')
        const workerSrc = path.resolve(rolldownDistDir, 'worker.js')
        if (existsSync(wasmSrc)) {
          copyFileSync(wasmSrc, path.resolve(assetsDir, 'rolldown-binding.wasm32-wasi.wasm'))
        }
        if (existsSync(workerSrc)) {
          copyFileSync(workerSrc, path.resolve(assetsDir, 'rolldown-worker.js'))
        }
      }
    }
  ],
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
})
