import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    fs: {
      allow: ['.', 'src', 'e2e', '../../node_modules']
    }
  },
  resolve: {
    alias: {
      'node:events': 'events',
      'node:path': 'path-browserify',
      'node:stream': 'readable-stream',
      'node:buffer': 'buffer',
      buffer: 'buffer',
      events: 'events',
      path: 'path-browserify',
      stream: 'readable-stream',
      'native-process': 'process',
      process: path.resolve(__dirname, 'src/polyfills/process.ts'),
      'node:process': path.resolve(__dirname, 'src/polyfills/process.ts')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env.NODE_DEBUG': 'false'
  },
  optimizeDeps: {
    include: ['memfs', 'buffer', 'events', 'path-browserify', 'readable-stream', 'process']
  }
})
