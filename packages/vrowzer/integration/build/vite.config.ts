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
 * Adds exports to `/src/index.ts` that show the plugin instance: how many times it transformed the
 * module, an ID of the instance, and `process.env.NODE_ENV` when the config was evaluated.
 */
function markerPlugin(): Plugin {
  let transforms = 0
  const instance = Math.random().toString(36).slice(2)
  const nodeEnvAtConfig = process.env.NODE_ENV
  return {
    name: 'vrowzer-test:marker',
    transform(code, id) {
      if (!id.endsWith('/src/index.ts')) {
        return
      }
      transforms++
      return `${code}
export const markerTransforms = ${transforms}
export const markerInstance = ${JSON.stringify(instance)}
export const markerNodeEnv = ${JSON.stringify(nodeEnvAtConfig ?? null)}
`
    }
  }
}

/**
 * Never finishes a build whose `/src/index.ts` contains `HANG_BUILD`, for the tests of the timeout,
 * the abort and `dispose()`.
 */
function hangPlugin(): Plugin {
  return {
    name: 'vrowzer-test:hang',
    apply: 'build',
    transform(code, id) {
      if (id.endsWith('/src/index.ts') && code.includes('HANG_BUILD')) {
        return new Promise(() => {})
      }
    }
  }
}

export default defineConfig({
  plugins: [
    markerPlugin(),
    hangPlugin(),
    VrowzerPlugin({
      auto: false,
      serviceWorkerEntry: resolve(__dirname, '../../dist/service-worker.ts'),
      build: true
    })
  ]
})
