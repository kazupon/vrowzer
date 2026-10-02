import path from 'node:path'
import { defineConfig } from 'vite-plus'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default defineConfig({
  resolve: {
    alias: {
      // Map @vrowzer/rolldown shared build imports to pre-bundled dist files
      '@vrowzer/rolldown/experimental': path.resolve(__dirname, '../../dist/experimental.js'),
      '@vrowzer/rolldown': path.resolve(__dirname, '../../dist/index.js'),
      // Use @vrowzer/fs browser build to avoid Node.js module externalization
      // Use @vrowzer/fs source to avoid re-bundling issues with pre-built dist files
      '@vrowzer/fs': path.resolve(__dirname, '../../../fs/src/index.ts'),
      // Node.js polyfills for memfs dependencies
      'node:buffer': 'buffer',
      'node:events': path.resolve(__dirname, '../../../node-polyfill/src/events.ts'),
      'node:path': 'pathe',
      'node:stream': 'readable-stream',
      buffer: 'buffer'
    }
  },
  build: {
    target: 'esnext',
    minify: false,
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
