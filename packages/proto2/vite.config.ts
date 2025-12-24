import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import type { Plugin } from 'vite'

/**
 * Plugin to add Service-Worker-Allowed header to SW script
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'service-worker-allowed',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Add header for Service Worker script
        if (req.url?.includes('/sw/') || req.url?.includes('sw.ts')) {
          res.setHeader('Service-Worker-Allowed', '/')
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    serviceWorkerPlugin(),
    // Plugin to proxy oxc-transform browser from CDN and rewrite imports
    {
      name: 'oxc-transform-proxy',
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
          if (!req.url?.startsWith('/api/oxc-transform/')) {
            console.log('[oxc-transform-proxy] Passing through:', req.url)
            return next()
          }

          const path = req.url.slice('/api/oxc-transform'.length) // e.g., '/dist/index.browser.mjs'
          const cdnUrl = `https://cdn.jsdelivr.net/npm/@oxc-transform/binding-wasm32-wasi${path}`

          console.log('[oxc-transform-proxy] Fetching:', cdnUrl)

          try {
            const response = await fetch(cdnUrl, {
              headers: {
                'User-Agent': 'Oxc-Transform Browser Proxy',
                Accept: 'application/javascript, application/json, text/plain, */*'
              }
            })

            if (!response.ok) {
              res.statusCode = response.status
              res.end(`Failed to fetch ${cdnUrl}: ${response.status}`)
              return
            }

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
                `const __wasmUrl = new URL('./transform.wasm32-wasi.wasm', import.meta.url).href`,
                `const __wasmUrl = ${JSON.stringify(new URL('transform.wasm32-wasi.wasm', cdnUrl).href)}`
              )

            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Content-Length', Buffer.byteLength(body).toString())
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
            res.setHeader('Cross-Origin-Embedder-Policy', embedderPolicy)
            res.end(body)
          } catch (err) {
            console.error('[oxc-transform-proxy] Error:', err)
            res.statusCode = 500
            res.end(`Proxy error: ${(err as Error).message}`)
          }
        })
      }
    }
  ]
})
