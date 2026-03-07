import { defineConfig } from '@vrowser/vite-plugin/config'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'

export default defineConfig({
  plugins: [
    // Alias `vue` to the browser ESM build provided as a virtual file
    {
      name: 'vrowser:vue-alias',
      config() {
        return {
          resolve: {
            alias: {
              vue: '/vendor/vue.esm-browser.js'
            }
          }
        }
      }
    },
    vue({ compiler }),
    yaml()
  ]
})
