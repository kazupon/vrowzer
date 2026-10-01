/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Vrowzer as VrowzerPlugin } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    VrowzerPlugin({
      auto: false,
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
