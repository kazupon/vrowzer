import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // TODO(kazupon): some modules to be added
      // - pathe
      piccolors: './node_modules/piccolors/picocolors.browser.js',
      'memfs-browser': path.resolve(
        import.meta.dirname,
        './node_modules/memfs-browser/dist/memfs.esm.js'
      ),
      'node:path': path.resolve(import.meta.dirname, './node_modules/pathe/dist/index.mjs'),
      path: path.resolve(import.meta.dirname, './node_modules/pathe/dist/index.mjs'),
      'node:buffer': path.resolve(import.meta.dirname, './node_modules/buffer/index.js'),
      buffer: path.resolve(import.meta.dirname, './node_modules/buffer/index.js'),
      // 'node:fs': path.resolve(import.meta.dirname, './src/polyfills/fs.ts'),
      'node:fs/promises': path.resolve(import.meta.dirname, './src/polyfills/fsp.ts')
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless' // require-corp → credentialless
    }
  },
  plugins: [
    vue(),
    // Plugin to add CORS headers for SharedArrayBuffer support
    {
      name: 'configure-cors-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Required for SharedArrayBuffer (used by @rolldown/browser)
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      }
    },
    // Plugin to proxy @rolldown/browser from CDN and rewrite imports
    {
      name: 'rolldown-proxy',
      configureServer(server) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- NOTE(kazupon): middleware can be async
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '', 'http://localhost')
          const embedderPolicy = 'credentialless' // or 'require-corp'

          // same-origin以外のリソースはproxyする
          if (url.pathname === '/proxy') {
            const target = url.searchParams.get('q')
            if (target) {
              const response = await fetch(target)
              const buffer = await response.arrayBuffer()
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
              res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Content-Length', Buffer.byteLength(Buffer.from(buffer)).toString())
              res.setHeader(
                'Content-Type',
                response.headers.get('content-type') || 'application/octet-stream'
              )
              res.write(Buffer.from(buffer))
              res.end()
              return
            }
          }

          // /api/rolldown/* 以外へのアクセスはそのまま通す
          if (!req.url?.startsWith('/api/rolldown/')) {
            console.log('[rolldown-proxy] Passing through:', req.url)
            return next()
          }

          const path = req.url.slice('/api/rolldown'.length) // e.g., '/dist/index.browser.mjs'
          const cdnUrl = `https://cdn.jsdelivr.net/npm/@rolldown/browser${path}`

          console.log('[rolldown-proxy] Fetching:', cdnUrl)

          try {
            const response = await fetch(cdnUrl, {
              headers: {
                'User-Agent': 'Rolldown Browser Proxy',
                Accept: 'application/javascript, application/json, text/plain, */*'
              }
            })

            if (!response.ok) {
              res.statusCode = response.status
              res.end(`Failed to fetch ${cdnUrl}: ${response.status}`)
              return
            }

            // TODO(kazupon): still request the below URL from client ...
            // https://cdn.jsdelivr.net/npm/@rolldown/browser/dist/wasi-worker-browser.mjs

            let body = await response.text()

            // Rewrite imports to use CDN URLs
            body = body
              .replaceAll(
                `from '@napi-rs/wasm-runtime'`,
                `from 'https://cdn.jsdelivr.net/npm/@napi-rs/wasm-runtime/+esm'`
              )
              .replaceAll(
                `from '@napi-rs/wasm-runtime/fs'`,
                `from 'https://cdn.jsdelivr.net/npm/@napi-rs/wasm-runtime/fs/+esm'`
              )
              .replaceAll(
                `import __wasmUrl from './rolldown-binding.wasm32-wasi.wasm?url'`,
                `const __wasmUrl = ${JSON.stringify(new URL('rolldown-binding.wasm32-wasi.wasm', cdnUrl).href)}`
              )
              .replaceAll(
                `const __wasmUrl = new URL('./rolldown-binding.wasm32-wasi.wasm', ${'import.meta'}.url).href`,
                `const __wasmUrl = ${JSON.stringify(new URL('rolldown-binding.wasm32-wasi.wasm', cdnUrl).href)}`
              )
              .replaceAll(`from "pathe"`, `from "https://cdn.jsdelivr.net/npm/pathe/+esm"`)
              .replaceAll(`from "ansis"`, `from "https://cdn.jsdelivr.net/npm/ansis/+esm"`)

            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Content-Length', Buffer.byteLength(body).toString())
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
            res.end(body)
          } catch (err) {
            console.error('[rolldown-proxy] Error:', err)
            res.statusCode = 500
            res.end(`Proxy error: ${(err as Error).message}`)
          }
        })
      }
    }
  ]
})
