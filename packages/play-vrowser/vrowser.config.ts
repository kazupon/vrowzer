import { defineConfig } from '@vrowser/vite-plugin/config'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'

export default defineConfig({
  resolve: {
    alias: [
      { find: 'react/jsx-dev-runtime', replacement: '/vendor/react-jsx-dev-runtime.js' },
      { find: 'react-dom/client', replacement: '/vendor/react-dom-client.js' },
      { find: 'react', replacement: '/vendor/react.js' },
      { find: 'vue', replacement: '/vendor/vue.js' }
    ]
  },
  plugins: [
    // compiler option bypasses createRequire-based loading (not available in Worker)
    vue({ compiler }),
    yaml()
  ]
})
