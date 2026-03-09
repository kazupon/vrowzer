import { defineConfig } from '@vrowser/vite-plugin/config'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'
// Pre-load refresh runtime at bundle time via ?raw (host Vite inlines as string for Worker).
// Direct path bypasses package.json exports restriction.
import refreshRuntime from './node_modules/@vitejs/plugin-react/dist/refresh-runtime.js?raw'

import type { Plugin } from 'vite'

// Provides /@react-refresh as a virtual module without readFileSync (Worker-safe).
// IMPORTANT: This must resolve /@react-refresh to itself (not to a different path like
// /vendor/react-refresh-runtime.js) so that preamble and transformed app code share
// the same module instance. Using resolve.alias would create a different URL which
// causes separate ESM module instances with separate internal state.
function reactRefreshRuntimePlugin(): Plugin {
  const runtimeCode = (refreshRuntime as string).replace(
    /__README_URL__/g,
    'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react'
  )
  return {
    name: 'vrowser:react-refresh-runtime',
    enforce: 'pre',
    resolveId(id) {
      if (id === '/@react-refresh') return id
    },
    load(id) {
      if (id === '/@react-refresh') return runtimeCode
    }
  }
}

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
    // Provides /@react-refresh without readFileSync (must be before react())
    reactRefreshRuntimePlugin(),
    // compiler option bypasses createRequire-based loading (not available in Worker)
    vue({ compiler }),
    react(),
    yaml()
  ]
})
