import { DevTools } from '@vitejs/devtools'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH = 'true'

const devtoolsPlugins = await DevTools()

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-vue', 'vue/compiler-sfc', 'vue']
  },
  plugins: [
    vue({ compiler }),
    Vrowzer({
      experimental: { ide: true, devtools: true }
    }),
    ...devtoolsPlugins.filter(p => p.name !== 'vite:devtools:injection')
  ]
})
