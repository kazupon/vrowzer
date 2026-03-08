import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
  plugins: [
    vue(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        '../../../packages/vrowser/dist/service-worker.ts'
      )
    })
  ]
})
