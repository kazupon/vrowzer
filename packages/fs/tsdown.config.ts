import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig([
  {
    platform: 'node',
    entry: ['./src/index.ts', './src/promises.ts'],
    format: ['esm'],
    dts: true
    // publint: true,
  },
  {
    platform: 'browser',
    entry: ['./src/index.ts', './src/promises.ts'],
    outDir: './dist/browser',
    format: ['esm'],
    dts: true,
    // publint: true,
    // Bundle these dependencies (don't externalize)
    noExternal: [
      'memfs',
      'buffer',
      '@vrowser/node-polyfill/events',
      'pathe',
      'readable-stream',
      '@vrowser/node-polyfill/process',
      /^@jsonjoy\.com\//
    ],
    // Node.js module aliases for browser compatibility
    alias: {
      'node:events': '@vrowser/node-polyfill/events',
      'node:path': 'pathe',
      'node:stream': 'readable-stream',
      'node:buffer': 'buffer',
      buffer: 'buffer',
      events: '@vrowser/node-polyfill/events',
      path: 'pathe',
      stream: 'readable-stream',
      process: '@vrowser/node-polyfill/process'
    },
    // Environment variable replacements
    define: {
      'process.env.NODE_ENV': "'production'",
      'process.env.NODE_DEBUG': 'false'
    }
  }
])

export default config
