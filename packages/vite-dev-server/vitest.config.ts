import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
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
      acc['@vrowser/vite-dev-server'] = entryPath
      return acc
    }
    const entryPath = path.resolve(__dirname, `./dist/node/${target}.js`)
    if (!fs.existsSync(entryPath)) {
      // Skip if entry doesn't exist (types-only exports)
      return acc
    }
    acc[`@vrowser/vite-dev-server/${target}`] = entryPath
    return acc
  },
  {} as Record<string, string>
)

// Add alias for @vrowser/service-worker/controller (used in browser tests)
const serviceWorkerControllerPath = path.resolve(__dirname, '../service-worker/dist/controller.js')
if (fs.existsSync(serviceWorkerControllerPath)) {
  alias['@vrowser/service-worker/controller'] = serviceWorkerControllerPath
}

// Node.js polyfill aliases for Service Worker bundling (browser environment)
// These are used by unplugin-service-worker's rolldown bundler via resolve.alias extraction
const nodePolyfillAliases: Record<string, string> = {
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
  'node:perf_hooks': '@vrowser/node-polyfill/perf_hooks',
  'node:crypto': '@vrowser/node-polyfill/crypto',
  'node:tty': '@vrowser/node-polyfill/tty',
  'node:module': '@vrowser/node-polyfill/module',
  buffer: 'buffer',
  dns: '@vrowser/node-polyfill/dns',
  events: '@vrowser/node-polyfill/events',
  path: 'pathe',
  stream: 'readable-stream/lib/stream',
  readline: '@vrowser/node-polyfill/readline',
  util: '@vrowser/node-polyfill/util',
  perf_hooks: '@vrowser/node-polyfill/perf_hooks',
  fs: '@vrowser/fs',
  'fs/promises': '@vrowser/fs/promises',
  url: '@vrowser/node-polyfill/url',
  crypto: '@vrowser/node-polyfill/crypto',
  tty: '@vrowser/node-polyfill/tty',
  module: '@vrowser/node-polyfill/module',
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
