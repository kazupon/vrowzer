import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
  plugins: [VrowzerManifest(), vue({ compiler }), yaml(), Vrowzer({ auto: false })]
})
