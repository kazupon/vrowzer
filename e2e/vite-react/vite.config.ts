import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

import type { Plugin } from 'vite'

const refreshRuntime = readFileSync(
  resolve(import.meta.dirname, 'node_modules/@vitejs/plugin-react/dist/refresh-runtime.js'),
  'utf-8'
)

function reactRefreshRuntimePlugin(): Plugin {
  const runtimeCode = refreshRuntime.replace(
    /__README_URL__/g,
    'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react'
  )
  return {
    name: 'vrowser:react-refresh-runtime',
    enforce: 'pre',
    resolveId(id) {
      if (id === '/@react-refresh') {
        return id
      }
    },
    load(id) {
      if (id === '/@react-refresh') {
        return runtimeCode
      }
    }
  }
}

export default defineConfig({
  optimizeDeps: {
    exclude: ['@vitejs/plugin-react']
  },
  plugins: [VrowserManifest(), reactRefreshRuntimePlugin(), react(), Vrowser()]
})
