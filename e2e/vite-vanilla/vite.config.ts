import { resolve } from 'node:path'
import yaml from '@rollup/plugin-yaml'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    VrowserManifest(),
    yaml(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        '../../packages/vrowser/dist/service-worker.ts'
      )
    })
  ]
})
