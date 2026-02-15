import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), ServiceWorker({ serviceWorkerAllowed: '/' })],
  define: {
    'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
  resolve: {
    alias: {
      'node:events': '@vrowser/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream/lib/stream',
      'node:buffer': 'buffer',
      buffer: 'buffer',
      events: '@vrowser/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream/lib/stream',
      // NOTE(kazupon):
      // required('process/`) at `readable-stream/lib/internal/streams/pipeline.js:3:25` ...
      'process/': '@vrowser/node-polyfill/process',
      process: '@vrowser/node-polyfill/process',
      'node:fs': '@vrowser/fs',
      'node:fs/promises': '@vrowser/fs/promises',
      fs: '@vrowser/fs',
      'fs/promises': '@vrowser/fs/promises',
      'node:url': '@vrowser/node-polyfill/url',
      url: '@vrowser/node-polyfill/url'
    }
  },
  preview: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
})
