import { resolve } from 'node:path'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        '../../../packages/vrowser/dist/service-worker.ts'
      )
    })
  ]
})
