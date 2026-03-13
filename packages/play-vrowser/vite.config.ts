import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import yaml from '@rollup/plugin-yaml'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { DevTools } from '@vitejs/devtools'
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

const enableDevTools = !!(process.env.VITE_DEVTOOLS || '')

export default defineConfig({
  define: {
    'process.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
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
  build: {
    rolldownOptions: {
      ...(enableDevTools ? { devtools: {} } : {})
    }
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
    // All packages use nodeModules in virtual FS.
    // CJS packages (React) are pre-bundled to ESM by gen:manifest.
    Vrowser(),
    enableDevTools && DevTools()
  ]
})
