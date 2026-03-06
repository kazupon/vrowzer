import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        'node_modules/vrowser/dist/service-worker.ts'
      )
    })
  ]
})
