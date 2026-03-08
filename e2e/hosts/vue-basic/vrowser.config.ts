import { defineConfig } from '@vrowser/vite-plugin/config'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'

export default defineConfig({
  resolve: { alias: { vue: '/vendor/vue.js' } },
  plugins: [vue({ compiler }), yaml()]
})
