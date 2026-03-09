import path from 'node:path'
import { defineConfig } from 'vite'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default defineConfig({
  resolve: {
    alias: {
      // Map @vrowser/rolldown imports to the pre-bundled dist files
      '@vrowser/rolldown/browser/experimental': path.resolve(
        __dirname,
        '../../dist/browser/experimental.js'
      ),
      '@vrowser/rolldown/browser': path.resolve(__dirname, '../../dist/browser/index.js')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}'
  },
  build: {
    target: 'esnext',
    minify: false,
    // Don't process worker URLs in @vrowser/rolldown dist files
    // Worker scripts are pre-bundled and copied separately
    rollupOptions: {
      input: path.join(__dirname, 'index.html')
    }
  },
  worker: {
    format: 'es'
  },
  // Required for SharedArrayBuffer (used by rolldown WASM runtime)
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
