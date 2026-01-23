import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'

import type { Plugin } from 'vite'

/**
 * Plugin to add Service-Worker-Allowed header to SW script
 */
function serviceWorkerHeaderPlugin(): Plugin {
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
      // @ts-expect-error -- middleware type
      server.middlewares.use(addServiceWorkerHeader)
    },
    configurePreviewServer(server) {
      // @ts-expect-error -- middleware type
      server.middlewares.use(addServiceWorkerHeader)
    }
  }
}

export default defineConfig({
  plugins: [vue(), ServiceWorker(), serviceWorkerHeaderPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.join(process.cwd(), 'index.html'),
        preview: path.join(process.cwd(), 'src/preview/index.html')
      }
    }
  }
})
