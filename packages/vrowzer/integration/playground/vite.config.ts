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

function fsHtmlProxyWebWorkerPlugin(): Plugin {
  const virtualId = 'virtual:vrowzer-test-fs-html-proxy'
  const resolvedVirtualId = `\0${virtualId}`
  const inlineModuleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HTML proxy</title>
  </head>
  <body>
    <script type="module">
      export const marker = 'inline proxy loaded'
    </script>
  </body>
</html>`
  const htmlPaths = {
    fsPath: '/@fs/fs-html-proxy/fs.html',
    rootPath: '/fs-html-proxy/root.html'
  }
  let runtimeServer: ViteDevServer | undefined

  return {
    name: 'vrowzer-test:fs-html-proxy-web-worker',
    apply: 'serve',
    configureServer(server) {
      const middlewares = (server as { middlewares?: unknown }).middlewares
      if (server.config.root !== '/' || middlewares) {
        return
      }

      runtimeServer = server
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

      const proxyUrls: Record<string, string> = {}
      for (const [name, htmlPath] of Object.entries(htmlPaths)) {
        const transformed = await runtimeServer.transformIndexHtml(htmlPath, inlineModuleHtml)
        const proxyUrl = transformed.match(/src="([^"]*html-proxy[^"]*)"/)?.[1]
        if (!proxyUrl) {
          throw new Error(`HTML proxy URL was not generated for ${htmlPath}`)
        }
        proxyUrls[name] = proxyUrl
      }

      return `export default ${JSON.stringify(proxyUrls)}`
    }
  }
}

function postcssOnceExitWebWorkerPlugin(): Plugin {
  return {
    name: 'vrowzer-test:postcss-once-exit-web-worker',
    apply: 'serve',
    config() {
      return {
        resolve: {
          alias: [
            {
              find: './injected-bg.png',
              replacement: '/postcss-once-exit/injected-source/injected-bg.png'
            }
          ]
        },
        css: {
          postcss: {
            plugins: [
              {
                postcssPlugin: 'vrowzer-test:inject-url-once-exit',
                OnceExit(root, { postcss }) {
                  root.walkAtRules('inject-url-once-exit', atRule => {
                    atRule.remove()
                    root.prepend(
                      postcss.parse(
                        '.inject-url-once-exit { background-image: url(./injected-bg.png) }',
                        {
                          from: '/postcss-once-exit/injected-source/injected.css'
                        }
                      )
                    )
                  })
                }
              }
            ]
          }
        }
      }
    }
  }
}

function serverOriginWebWorkerPlugin(): Plugin {
  return {
    name: 'vrowzer-test:server-origin-web-worker',
    apply: 'serve',
    config() {
      return {
        server: {
          origin: 'https://assets.vrowzer.test'
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    trailingSlashWebWorkerPlugin(),
    fsHtmlProxyWebWorkerPlugin(),
    postcssOnceExitWebWorkerPlugin(),
    serverOriginWebWorkerPlugin(),
    Vrowzer({
      auto: false,
      basePath: '/__preview__/',
      // Explicit Service Worker entry from vrowzer package
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
