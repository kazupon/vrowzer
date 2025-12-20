import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'oxc-parser': path.resolve(import.meta.dirname, 'node_modules/oxc-parser/src-js/wasm.js'),
      '@oxc-parser/binding-wasm32-wasi': path.resolve(
        import.meta.dirname,
        'node_modules/@oxc-parser/binding-wasm32-wasi/browser-bundle.js'
      )
    }
  },
  plugins: [
    {
      name: 'oxc-parser-proxy',
      configureServer(server) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- NOTE(kazupon): middleware can be async
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? '', 'http://localhost')
          const embedderPolicy = 'credentialless' // or 'require-corp'

          // /api/rolldown/* 以外へのアクセスはそのまま通す
          if (!req.url?.startsWith('/api/oxc-parser/')) {
            console.log('[oxc-parser-proxy] Passing through:', req.url)
            return next()
          }

          const path = req.url.slice('/api/oxc-parser'.length)
          const cdnUrl = `https://cdn.jsdelivr.net/npm/@oxc-parser${path}`

          console.log('[oxc-parser-proxy] Fetching:', cdnUrl)

          try {
            const response = await fetch(cdnUrl, {
              headers: {
                'User-Agent': 'Oxc Parser Browser Proxy',
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
                `const __wasmUrl = new URL('./parser.wasm32-wasi.wasm', ${'import.meta'}.url).href`,
                `const __wasmUrl = ${JSON.stringify(new URL('parser.wasm32-wasi.wasm', cdnUrl).href)}`
                // `var __wasmUrl = new URL("./parser.wasm32-wasi.wasm", ${'import.meta'}.url).href`,
                // `var __wasmUrl = ${JSON.stringify(new URL('parser.wasm32-wasi.wasm', cdnUrl).href)}`
              )
            // .replaceAll(
            //   `const worker = new Worker(new URL("./wasi-worker-browser.mjs", ${'import.meta'}.url),`,
            //   `const worker = new Worker(new URL('@oxc-parser/binding-wasm32-wasi/wasi-worker-browser.mjs', ${'import.meta'}.url),`
            // )

            console.log('[oxc-parser-proxy] Fetched and rewritten:', cdnUrl)
            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Content-Length', Buffer.byteLength(body).toString())
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
            res.end(body)
          } catch (err) {
            console.error('[oxc-parser-proxy] Error:', err)
            res.statusCode = 500
            res.end(`Proxy error: ${(err as Error).message}`)
          }
        })
      }
    }
  ]
})
