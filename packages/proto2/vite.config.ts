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
  plugins: [vue(), serviceWorkerPlugin()]
})
