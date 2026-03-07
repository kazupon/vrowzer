import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  // Exclude vue-related packages from pre-bundling so WW can import them as ESM
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
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
