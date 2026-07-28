import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: [
    {
      platform: 'node',
      entry: ['./src/index.ts', './src/promises.ts', './src/watcher/index.ts'],
      format: ['esm'],
      dts: true
    },
    {
      platform: 'browser',
      entry: ['./src/index.ts', './src/promises.ts', './src/watcher/index.ts'],
      outDir: './dist/browser',
      format: ['esm'],
      dts: true,
      noExternal: [
        'memfs',
        'buffer',
        '@vrowzer/node-polyfill/events',
        'pathe',
        'readable-stream',
        '@vrowzer/node-polyfill/process',
        /^@jsonjoy\.com\//
      ],
      alias: {
        'node:events': '@vrowzer/node-polyfill/events',
        'node:path': 'pathe',
        'node:stream': 'readable-stream',
        'node:buffer': 'buffer',
        buffer: 'buffer',
        events: '@vrowzer/node-polyfill/events',
        path: 'pathe',
        stream: 'readable-stream',
        process: '@vrowzer/node-polyfill/process'
      },
      define: {
        'process.env.NODE_ENV': "'production'",
        'process.env.NODE_DEBUG': 'false'
      }
    }
  ],
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
