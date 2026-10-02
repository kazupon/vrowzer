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
      // Only the Web Worker's dev server has environments and the root of the virtual project
      const environments = (server as { environments?: unknown }).environments
      if (server.config.root !== '/' || !environments) {
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
      // Only the Web Worker's dev server has environments and the root of the virtual project
      const environments = (server as { environments?: unknown }).environments
      if (server.config.root !== '/' || !environments) {
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

function hmrClientTrackingWebWorkerPlugin(): Plugin {
  const virtualId = 'virtual:vrowzer-test-hmr-clients'
  const resolvedVirtualId = `\0${virtualId}`
  const clientIds = new Set<string>()
  let runtimeServer: ViteDevServer | undefined

  return {
    name: 'vrowzer-test:hmr-client-tracking-web-worker',
    apply: 'serve',
    configureServer(server) {
      // Only the Web Worker's dev server has environments and the root of the virtual project
      const environments = (server as { environments?: unknown }).environments
      if (server.config.root !== '/' || !environments) {
        return
      }

      runtimeServer = server
      server.ws.on('vite:client:connect', (_data, client) => {
        if (client.clientId) {
          clientIds.add(client.clientId)
        }
      })
      server.ws.on('vite:client:disconnect', (_data, client) => {
        if (client.clientId) {
          clientIds.delete(client.clientId)
        }
      })
    },
    resolveId(id) {
      if (id === virtualId || id.startsWith(`${virtualId}?`)) {
        return `\0${id}`
      }
    },
    load(id) {
      if (!id.startsWith(resolvedVirtualId)) {
        return
      }
      if (!runtimeServer) {
        throw new Error('Web Worker dev server is not available')
      }
      return `export default ${JSON.stringify([...clientIds])}`
    }
  }
}

/**
 * Lets the file synchronization tests delay and fail how the Web Worker applies file changes.
 *
 * - `watchChange` of an update under `/file-sync/held/` waits until `/file-sync/release` is written.
 * - `watchChange` under `/file-sync/fail-once/` throws the first time for each path.
 * - `hotUpdate` of a deletion under `/file-sync/held-hmr/` waits until `/file-sync/release` is written.
 */
function fileSyncWebWorkerPlugin(): Plugin {
  const failedPaths = new Set<string>()
  let isWebWorker = false
  let hold: { promise: Promise<void>; release: () => void } | null = null

  function waitForRelease(): Promise<void> {
    if (!hold) {
      let release!: () => void
      const promise = new Promise<void>(resolve => {
        release = resolve
      })
      hold = { promise, release }
    }
    return hold.promise
  }

  return {
    name: 'vrowzer-test:file-sync-web-worker',
    apply: 'serve',
    configureServer(server) {
      // Only the Web Worker's dev server has environments and the root of the virtual project
      const environments = (server as { environments?: unknown }).environments
      if (server.config.root !== '/' || !environments) {
        return
      }

      isWebWorker = true
    },
    async watchChange(id, { event }) {
      if (!isWebWorker) {
        return
      }
      if (id === '/file-sync/release') {
        hold?.release()
        hold = null
        return
      }
      if (id.startsWith('/file-sync/held/') && event === 'update') {
        await waitForRelease()
        return
      }
      if (id.startsWith('/file-sync/fail-once/') && !failedPaths.has(id)) {
        failedPaths.add(id)
        throw new Error(`vrowzer-test: watchChange failed for ${id}`)
      }
    },
    async hotUpdate({ type, file }) {
      if (isWebWorker && type === 'delete' && file.startsWith('/file-sync/held-hmr/')) {
        await waitForRelease()
      }
    }
  }
}

/**
 * Adds middlewares as Vite plugins do: one in `configureServer`, which runs before the internal
 * middlewares of the dev server, and one in the function that the hook returns, which runs after
 * them and before `index.html`.
 */
function middlewaresWebWorkerPlugin(): Plugin {
  return {
    name: 'vrowzer-test:middlewares-web-worker',
    apply: 'serve',
    configureServer(server) {
      // Only the Web Worker's dev server has environments and the root of the virtual project
      const environments = (server as { environments?: unknown }).environments
      if (server.config.root !== '/' || !environments) {
        return
      }

      // The Web Worker's middlewares are a Hono app under the preview base path
      const middlewares = server.middlewares as unknown as {
        use(path: string, handler: (c: { text(body: string): Response }) => Response): void
      }
      middlewares.use('/__middlewares__/pre', c => c.text('pre middleware'))
      middlewares.use('/__middlewares__/pre-shadowing.txt', c => c.text('pre middleware'))
      return () => {
        middlewares.use('/__middlewares__/post', c => c.text('post middleware'))
        middlewares.use('/__middlewares__/post-shadowed.txt', c => c.text('post middleware'))
      }
    }
  }
}

export default defineConfig({
  server: {
    origin: 'https://assets.vrowzer.test'
  },
  plugins: [
    trailingSlashWebWorkerPlugin(),
    fsHtmlProxyWebWorkerPlugin(),
    postcssOnceExitWebWorkerPlugin(),
    hmrClientTrackingWebWorkerPlugin(),
    fileSyncWebWorkerPlugin(),
    middlewaresWebWorkerPlugin(),
    Vrowzer({
      auto: false,
      basePath: '/__preview__/',
      // Explicit Service Worker entry from vrowzer package
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
