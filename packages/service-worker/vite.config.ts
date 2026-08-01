/**
 * Vite configuration for @vrowzer/service-worker playground
 */

import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, lazyPlugins } from 'vite-plus'
import pkg from './package.json' with { type: 'json' }

import type { Plugin } from 'vite-plus'

/**
 * Custom plugin to provide API endpoints for playground.
 * These endpoints are also handled by the Service Worker,
 * so we can verify SW intercepts requests correctly.
 */
function apiMiddleware(): Plugin {
  return {
    name: 'playground-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`)

        // API endpoint: /api/status
        if (url.pathname === '/api/status') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              source: 'server',
              message: 'Response from Vite dev server (not Service Worker)',
              timestamp: Date.now()
            })
          )
          return
        }

        // API endpoint: /api/echo
        if (url.pathname === '/api/echo') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              source: 'server',
              method: req.method,
              url: req.url,
              headers: req.headers
            })
          )
          return
        }

        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`)

        // API endpoint: /api/status
        if (url.pathname === '/api/status') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              source: 'server',
              message: 'Response from Vite preview server (not Service Worker)',
              timestamp: Date.now()
            })
          )
          return
        }

        // API endpoint: /api/echo
        if (url.pathname === '/api/echo') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              source: 'server',
              method: req.method,
              url: req.url,
              headers: req.headers
            })
          )
          return
        }

        next()
      })
    }
  }
}

const packageRoot = import.meta.dirname

function createTestAliases(): Record<string, string> {
  const targets = Object.keys(pkg.exports).flatMap(key => {
    if (key === './package.json') {
      return []
    }
    const target = key.split('./').filter(Boolean)[0]
    return target ? [target] : []
  })

  return targets.reduce(
    (aliases, target) => {
      const entryPath = path.resolve(packageRoot, `./dist/${target}.js`)
      if (!fs.existsSync(entryPath)) {
        throw new Error(`Build entry not found: ${entryPath}`)
      }
      aliases[`@vrowzer/service-worker/${target}`] = entryPath
      return aliases
    },
    {} as Record<string, string>
  )
}

const config: ReturnType<typeof defineConfig> = defineConfig(({ mode }) => {
  // Node API integrations use this mode; retain the CLI flag for direct test invocation.
  const isIntegrationServer = mode === 'integration' || process.argv.includes('--port')
  const isVitest = process.env.VITEST === 'true' && !isIntegrationServer
  const isIntegrationTest = isVitest || isIntegrationServer

  return {
    pack: {
      entry: ['./src/admin.ts', './src/controller.ts', './src/protocols.ts', './src/worker.ts'],
      clean: true,
      publint: true,
      dts: true,
      fixedExtension: false
    },
    root: path.resolve(packageRoot, isIntegrationTest ? '.' : './playground'),
    publicDir: isIntegrationTest ? path.resolve(packageRoot, 'test-public') : undefined,
    plugins: isVitest
      ? []
      : lazyPlugins(async () => {
          const { default: ServiceWorker } = await import('@vrowzer/unplugin-service-worker/vite')
          return [ServiceWorker(), apiMiddleware()]
        }),
    build: {
      outDir: './dist',
      sourcemap: true
    },
    ...(isVitest
      ? {
          server: {
            port: 5173
          },
          resolve: {
            alias: createTestAliases()
          }
        }
      : {})
  }
})

export default config
