import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      allow: ['.', 'src', 'integration', '../../node_modules']
    }
  },
  resolve: {
    alias: {
      'node:events': '@vrowzer/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream',
      'node:buffer': 'buffer',
      buffer: 'buffer',
      events: '@vrowzer/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream',
      'native-process': '@vrowzer/node-polyfill/process'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env.NODE_DEBUG': 'false'
  },
  optimizeDeps: {
    include: [
      'memfs',
      'buffer',
      '@vrowzer/node-polyfill/events',
      'pathe',
      'readable-stream',
      '@vrowzer/node-polyfill/process'
    ]
  }
})
