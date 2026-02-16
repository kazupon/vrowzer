import inject from '@rollup/plugin-inject'
import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    inject({
      process: '@vrowser/node-polyfill/process'
    }),
    vue(),
    ServiceWorker({ serviceWorkerAllowed: '/' })
  ],
  define: {
    'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
  resolve: {
    alias: {
      'node:events': '@vrowser/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream/lib/stream',
      'node:buffer': 'buffer',
      'node:dns': '@vrowser/node-polyfill/dns',
      'node:fs': '@vrowser/fs',
      'node:fs/promises': '@vrowser/fs/promises',
      'node:url': '@vrowser/node-polyfill/url',
      'node:readline': '@vrowser/node-polyfill/readline',
      'node:util': '@vrowser/node-polyfill/util',
      buffer: 'buffer',
      dns: '@vrowser/node-polyfill/dns',
      events: '@vrowser/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream/lib/stream',
      readline: '@vrowser/node-polyfill/readline',
      util: '@vrowser/node-polyfill/util',
      // NOTE(kazupon):
      // required('process/`) at `readable-stream/lib/internal/streams/pipeline.js:3:25` ...
      'process/': '@vrowser/node-polyfill/process',
      process: '@vrowser/node-polyfill/process',
      fs: '@vrowser/fs',
      'fs/promises': '@vrowser/fs/promises',
      url: '@vrowser/node-polyfill/url'
    }
  },
  preview: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
})
