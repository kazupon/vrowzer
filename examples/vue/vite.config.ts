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
    // auto: true (default) — manifest is auto-generated from app/ directory
    Vrowser({
      manifest: {
        sourceDir: './app',
        targets: ['vue']
      },
      experimental: { ide: true }
    })
  ]
})
