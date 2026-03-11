import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

import type { Plugin } from 'vite'

// Read refresh runtime source at config load time (Node.js).
// Direct path bypasses package.json exports restriction.
const refreshRuntime = readFileSync(
  resolve(import.meta.dirname, 'node_modules/@vitejs/plugin-react/dist/refresh-runtime.js'),
  'utf-8'
)

// Provides /@react-refresh as a virtual module without readFileSync (Worker-safe).
// IMPORTANT: This must resolve /@react-refresh to itself (not to a different path like
// /vendor/react-refresh-runtime.js) so that preamble and transformed app code share
// the same module instance. Using resolve.alias would create a different URL which
// causes separate ESM module instances with separate internal state.
function reactRefreshRuntimePlugin(): Plugin {
  const runtimeCode = refreshRuntime.replace(
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
  optimizeDeps: {
    exclude: [
      '@vitejs/plugin-vue',
      'vue/compiler-sfc',
      'vue',
      '@vitejs/plugin-react',
      '@sveltejs/vite-plugin-svelte',
      'svelte'
    ]
  },
  plugins: [
    // Transform vrowser-manifest.json imports to inline file contents
    VrowserManifest(),
    // Provides /@react-refresh without readFileSync (must be before react())
    reactRefreshRuntimePlugin(),
    // compiler option bypasses createRequire-based loading (not available in Worker)
    vue({ compiler }),
    react(),
    svelte(),
    yaml(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        'node_modules/vrowser/dist/service-worker.ts'
      ),
      // Worker-specific resolve settings (vendor aliases for browser runtime)
      resolve: {
        alias: [
          { find: 'react/jsx-dev-runtime', replacement: '/vendor/react-jsx-dev-runtime.js' },
          { find: 'react-dom/client', replacement: '/vendor/react-dom-client.js' },
          { find: 'react', replacement: '/vendor/react.js' },
          { find: 'vue', replacement: '/vendor/vue.js' },
          { find: 'svelte/internal/client', replacement: '/vendor/svelte-internal-client.js' },
          { find: 'svelte', replacement: '/vendor/svelte.js' }
        ]
      }
    })
  ]
})
