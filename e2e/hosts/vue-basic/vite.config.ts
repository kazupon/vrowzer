import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
  plugins: [
    vue({ compiler }),
    yaml(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        '../../../packages/vrowser/dist/service-worker.ts'
      ),
      resolve: {
        alias: [{ find: 'vue', replacement: '/vendor/vue.js' }]
      }
    })
  ]
})
