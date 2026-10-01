/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Vrowzer as VrowzerPlugin } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

import type { Plugin } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Holds the load of `/held.js` in the Web Worker until `/held-release` is written, so that a test
 * can stop the Service Worker while a request for it waits for the Web Worker.
 */
function heldModuleWebWorkerPlugin(): Plugin {
  let isWebWorker = false
  let release: (() => void) | null = null
  const held = new Promise<void>(resolve => {
    release = resolve
  })

  return {
    name: 'vrowzer-test:held-module-web-worker',
    apply: 'serve',
    configureServer(server) {
      const middlewares = (server as { middlewares?: unknown }).middlewares
      if (server.config.root !== '/' || middlewares) {
        return
      }

      isWebWorker = true
    },
    watchChange(id) {
      if (isWebWorker && id === '/held-release') {
        release?.()
      }
    },
    async load(id) {
      if (isWebWorker && id === '/held.js') {
        // The default loader reads the file afterwards
        await held
      }
    }
  }
}

export default defineConfig({
  plugins: [
    heldModuleWebWorkerPlugin(),
    VrowzerPlugin({
      auto: false,
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
