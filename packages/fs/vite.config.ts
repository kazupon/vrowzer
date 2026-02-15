import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      allow: ['.', 'src', 'e2e', '../../node_modules']
    }
  },
  resolve: {
    alias: {
      'node:events': '@vrowser/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream',
      'node:buffer': 'buffer',
      buffer: 'buffer',
      events: '@vrowser/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream',
      'native-process': '@vrowser/node-polyfill/process'
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
      '@vrowser/node-polyfill/events',
      'pathe',
      'readable-stream',
      '@vrowser/node-polyfill/process'
    ]
  }
})
