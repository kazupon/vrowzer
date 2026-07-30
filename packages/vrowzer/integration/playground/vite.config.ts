import { Vrowzer } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

import type { Plugin, ViteDevServer } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

function trailingSlashWebWorkerPlugin(): Plugin {
  const virtualId = 'virtual:vrowzer-test-trailing-slash'
  const resolvedVirtualId = `\0${virtualId}`
  const warmupUrls: string[] = []
  let runtimeServer: ViteDevServer | undefined

  return {
    name: 'vrowzer-test:trailing-slash-web-worker',
    apply: 'serve',
    configureServer(server) {
      const middlewares = (server as { middlewares?: unknown }).middlewares
      if (server.config.root !== '/' || middlewares) {
        return
      }

      runtimeServer = server
      const warmupRequest = server.warmupRequest.bind(server)
      server.warmupRequest = (url, options) => {
        if (url.endsWith('/filename.js') || url.endsWith('/other.js')) {
          warmupUrls.push(url)
        }
        return warmupRequest(url, options)
      }
    },
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId
      }
    },
    async load(id) {
      if (id !== resolvedVirtualId) {
        return
      }
      if (!runtimeServer) {
        throw new Error('Web Worker dev server is not available')
      }

      warmupUrls.length = 0
      await runtimeServer.transformIndexHtml(
        '/trailing-slash/dir/',
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Trailing slash</title>
  </head>
  <body>
    <script type="module" src="./filename.js"></script>
    <script type="module" src="../other.js"></script>
  </body>
</html>`
      )

      return `export default ${JSON.stringify(warmupUrls)}`
    }
  }
}

export default defineConfig({
  plugins: [
    trailingSlashWebWorkerPlugin(),
    Vrowzer({
      auto: false,
      basePath: '/__preview__/',
      // Explicit Service Worker entry from vrowzer package
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
