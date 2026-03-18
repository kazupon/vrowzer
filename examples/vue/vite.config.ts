import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
  plugins: [
    vue({ compiler }),
    Vrowser({
      experimental: { ide: true }
    })
  ]
})
