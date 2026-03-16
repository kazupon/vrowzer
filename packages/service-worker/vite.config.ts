/**
 * Vite configuration for @vrowser/service-worker playground
 */

import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { defineConfig } from 'vite'

import type { Plugin } from 'vite'

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

const isIntegrationTest = process.env.VITEST === 'true' || process.argv.includes('--port')

const config: ReturnType<typeof defineConfig> = defineConfig({
  root: isIntegrationTest ? '.' : './playground',
  publicDir: isIntegrationTest ? 'test-public' : undefined,
  plugins: [ServiceWorker(), apiMiddleware()],
  build: {
    outDir: './dist',
    sourcemap: true
  }
})

export default config
