import { Vrowzer as VrowzerPlugin } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/app/',
  plugins: [
    VrowzerPlugin({
      auto: false,
      basePath: '/app/__preview__/',
      serviceWorkerScope: '/app/',
      serviceWorkerVersion: 'app-v2',
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
