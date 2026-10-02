/**
 * SPIKE (#36): fixture for vrowzer.build()
 */

import { Vrowzer as VrowzerPlugin } from '@vrowzer/vite-plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

import type { Plugin } from 'vite-plus'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Adds exports to `/src/index.ts` that show the plugin instance: how many times this instance
 * transformed it, and `process.env.NODE_ENV` when the config was evaluated.
 */
function spikeStatePlugin(): Plugin {
  let transforms = 0
  const instance = Math.random().toString(36).slice(2)
  const nodeEnvAtConfig = process.env.NODE_ENV
  return {
    name: 'vrowzer-test:spike-state',
    transform(code, id) {
      if (!id.endsWith('/src/index.ts')) {
        return
      }
      transforms++
      return `${code}
export const spikeTransforms = ${transforms}
export const spikeInstance = ${JSON.stringify(instance)}
export const spikeNodeEnvAtConfig = ${JSON.stringify(nodeEnvAtConfig ?? null)}
`
    }
  }
}

export default defineConfig({
  plugins: [
    spikeStatePlugin(),
    VrowzerPlugin({
      auto: false,
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts')
    })
  ]
})
