import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { defineConfig } from 'vite'

import type { Plugin, ResolvedConfig } from 'vite'

// Placeholder for Service Worker path replacement
const SW_PATH_PLACEHOLDER = '__VITE_SW_PATH_PLACEHOLDER__'

/**
 * Plugin to build Service Worker as a separate bundle using rolldown
 */
function buildServiceWorkerPlugin(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'build-service-worker',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    transform(code, _id) {
      // Replace import.meta.env.VITE_BROWSER_SW_PATH with placeholder
      if (code.includes('import.meta.env.VITE_BROWSER_SW_PATH')) {
        return code.replace(
          /import\.meta\.env\.VITE_BROWSER_SW_PATH/g,
          JSON.stringify(SW_PATH_PLACEHOLDER)
        )
      }
    },
    async generateBundle(_options, bundle) {
      const input = path.join(process.cwd(), 'src/sw/sw.ts')

      const rolldownBundle = await rolldown({
        input,
        resolve: {
          extensions: ['.ts', '.js', '.mjs', '.json']
        }
      })

      try {
        const { output } = await rolldownBundle.generate({
          dir: path.join(process.cwd(), 'dist'),
          entryFileNames: 'sw-[hash].js',
          chunkFileNames: '[name]-[hash].js',
          format: 'esm',
          minify: config.build.minify !== false
        })

        // Find the Service Worker entry chunk
        const swChunk = output.find(chunk => chunk.type === 'chunk' && chunk.isEntry)
        if (!swChunk || swChunk.type !== 'chunk') {
          throw new Error('Service Worker entry chunk not found')
        }

        const swPath = '/' + swChunk.fileName
        console.log(`[build-service-worker] Service Worker path: ${swPath}`)

        // Replace placeholder with actual SW path in main bundle chunks
        for (const fileName of Object.keys(bundle)) {
          const chunk = bundle[fileName]
          if (chunk?.type === 'chunk' && chunk.code.includes(SW_PATH_PLACEHOLDER)) {
            chunk.code = chunk.code.replace(new RegExp(SW_PATH_PLACEHOLDER, 'g'), swPath)
            console.log(`[build-service-worker] Replaced SW path in: ${fileName}`)
          }
        }

        // Emit Service Worker files to the bundle
        for (const chunk of output) {
          if (chunk.type === 'chunk') {
            this.emitFile({
              type: 'asset',
              fileName: chunk.fileName,
              source: chunk.code
            })
          }
        }
      } finally {
        await rolldownBundle.close()
      }
    }
  }
}

/**
 * Plugin to proxy oxc-transform browser from CDN and rewrite imports
 */
function oxcTransformProxyPlugin(): Plugin {
  return {
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

        // /api/oxc-transform/* 以外へのアクセスはそのまま通す
        if (!req.url?.startsWith('/api/oxc-transform/')) {
          console.log('[oxc-transform-proxy] Passing through:', req.url)
          return next()
        }

        const path = req.url.slice('/api/oxc-transform'.length)
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
}

/**
 * Plugin to add Service-Worker-Allowed header to SW script
 */
function serviceWorkerPlugin(): Plugin {
  const addServiceWorkerHeader = (
    req: { url?: string },
    res: { setHeader: (name: string, value: string) => void },
    next: () => void
  ) => {
    // Add header for Service Worker script (dev: sw.ts, prod: sw.js)
    if (req.url?.includes('/sw/') || req.url?.includes('sw.ts') || req.url?.endsWith('/sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/')
    }
    next()
  }

  return {
    name: 'service-worker-allowed',
    configureServer(server) {
      // @ts-expect-error -- FIXME: type
      server.middlewares.use(addServiceWorkerHeader)
    },
    configurePreviewServer(server) {
      // @ts-expect-error -- FIXME: type
      server.middlewares.use(addServiceWorkerHeader)
    }
  }
}

function resolvePlugins() {
  return [
    vue(),
    ...(process.env.NODE_ENV === 'development'
      ? [oxcTransformProxyPlugin(), serviceWorkerPlugin()]
      : [buildServiceWorkerPlugin()])
  ]
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.join(process.cwd(), 'index.html'),
        preview: path.join(process.cwd(), 'src/preview/index.html')
      }
    }
  },
  plugins: resolvePlugins()
})
