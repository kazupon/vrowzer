import ServiceWorker from '@vrowzer/unplugin-service-worker/vite'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

const __dirname = import.meta.dirname

// collect build targets from `package.json` exports
const targets = Object.keys(pkg.exports).reduce((acc, key) => {
  if (key === './package.json') {
    return acc
  }
  // Handle root export "."
  if (key === '.') {
    acc.push('')
    return acc
  }
  const target = key.split('./').filter(Boolean)[0]
  if (target) {
    acc.push(target)
  }
  return acc
}, [] as string[])

// create `alias` entries for each target
const alias = targets.reduce(
  (acc, target) => {
    // Handle root export (empty string)
    if (target === '') {
      const entryPath = path.resolve(__dirname, './dist/node/index.js')
      if (!fs.existsSync(entryPath)) {
        // index.js entry is commented out in rolldown.config.ts — skip
        return acc
      }
      acc['@vrowzer/vite-dev-server'] = entryPath
      return acc
    }
    const entryPath = path.resolve(__dirname, `./dist/node/${target}.js`)
    if (!fs.existsSync(entryPath)) {
      // Skip if entry doesn't exist (types-only exports)
      return acc
    }
    acc[`@vrowzer/vite-dev-server/${target}`] = entryPath
    return acc
  },
  {} as Record<string, string>
)

// Add alias for @vrowzer/service-worker/controller (used in browser tests)
const serviceWorkerControllerPath = path.resolve(__dirname, '../service-worker/dist/controller.js')
if (fs.existsSync(serviceWorkerControllerPath)) {
  alias['@vrowzer/service-worker/controller'] = serviceWorkerControllerPath
}

// Node.js polyfill aliases for Service Worker bundling (browser environment)
// These are used by unplugin-service-worker's rolldown bundler via resolve.alias extraction
const nodePolyfillAliases: Record<string, string> = {
  'node:events': '@vrowzer/node-polyfill/events',
  'node:path': 'pathe',
  'node:stream': 'readable-stream/lib/stream',
  'node:buffer': 'buffer',
  'node:dns': '@vrowzer/node-polyfill/dns',
  'node:fs': '@vrowzer/fs',
  'node:fs/promises': '@vrowzer/fs/promises',
  'node:url': '@vrowzer/node-polyfill/url',
  'node:readline': '@vrowzer/node-polyfill/readline',
  'node:util': '@vrowzer/node-polyfill/util',
  'node:perf_hooks': '@vrowzer/node-polyfill/perf_hooks',
  'node:crypto': '@vrowzer/node-polyfill/crypto',
  'node:tty': '@vrowzer/node-polyfill/tty',
  'node:module': '@vrowzer/node-polyfill/module',
  buffer: 'buffer',
  dns: '@vrowzer/node-polyfill/dns',
  events: '@vrowzer/node-polyfill/events',
  path: 'pathe',
  stream: 'readable-stream/lib/stream',
  readline: '@vrowzer/node-polyfill/readline',
  util: '@vrowzer/node-polyfill/util',
  perf_hooks: '@vrowzer/node-polyfill/perf_hooks',
  fs: '@vrowzer/fs',
  'fs/promises': '@vrowzer/fs/promises',
  url: '@vrowzer/node-polyfill/url',
  crypto: '@vrowzer/node-polyfill/crypto',
  tty: '@vrowzer/node-polyfill/tty',
  module: '@vrowzer/node-polyfill/module',
}

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, 'test-public'),
  // NOTE: Cast to any due to vite version mismatch: vitest uses vite@7.x, but ServiceWorker plugin uses vite@8.x
  plugins: [ServiceWorker() as any],
  server: {
    port: 5174
  },
  resolve: {
    alias: { ...alias, ...nodePolyfillAliases }
  }
})
