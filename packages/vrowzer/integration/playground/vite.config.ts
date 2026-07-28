import { Vrowzer } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    Vrowzer({
      auto: false,
      basePath: '/__preview__/',
      // Explicit Service Worker entry from vrowzer package
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
