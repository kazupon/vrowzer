import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ['./src/index.ts', './src/promises.ts', './src/polyfills/process.ts'],
  format: ['esm'],
  dts: true,
  publint: true,
  platform: 'browser',

  // Bundle these dependencies (don't externalize)
  noExternal: [
    'memfs',
    'buffer',
    'events',
    'path-browserify',
    'readable-stream',
    'process',
    /^@jsonjoy\.com\//
  ],

  // Node.js module aliases for browser compatibility
  alias: {
    'node:events': 'events',
    'node:path': 'path-browserify',
    'node:stream': 'readable-stream',
    'node:buffer': 'buffer',
    buffer: 'buffer',
    events: 'events',
    path: 'path-browserify',
    stream: 'readable-stream',
    'native-process': 'process', // NOTE(kazuya): avoid circular `process` reference
    process: path.resolve(__dirname, 'src/polyfills/process.ts'),
    'node:process': path.resolve(__dirname, 'src/polyfills/process.ts')
  },

  // Environment variable replacements
  define: {
    'process.env.NODE_ENV': "'production'",
    'process.env.NODE_DEBUG': 'false'
  }
})

export default config
