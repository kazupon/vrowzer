import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig([
  {
    platform: 'node',
    entry: ['./src/index.ts', './src/promises.ts', './src/watcher/index.ts'],
    format: ['esm'],
    dts: true
    // publint: true,
  },
  {
    platform: 'browser',
    entry: ['./src/index.ts', './src/promises.ts', './src/watcher/index.ts'],
    outDir: './dist/browser',
    format: ['esm'],
    dts: true,
    // publint: true,
    // Bundle these dependencies (don't externalize)
    noExternal: [
      'memfs',
      'buffer',
      '@vrowzer/node-polyfill/events',
      'pathe',
      'readable-stream',
      '@vrowzer/node-polyfill/process',
      /^@jsonjoy\.com\//
    ],
    // Node.js module aliases for browser compatibility
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
    // Environment variable replacements
    define: {
      'process.env.NODE_ENV': "'production'",
      'process.env.NODE_DEBUG': 'false'
    }
  }
])

export default config
