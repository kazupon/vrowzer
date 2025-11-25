import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // @rollup/browser uses WASM, must be excluded from pre-bundling
    exclude: ['@rollup/browser'],
  },
})
