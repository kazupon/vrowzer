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
        // Skip if index.js doesn't exist (nodeConfig's index entry is commented out)
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

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, 'test-public'),
  // NOTE: Cast to any due to vite version mismatch: vitest uses vite@7.x, but ServiceWorker plugin uses vite@8.x
  plugins: [ServiceWorker() as any],
  server: {
    port: 5174
  },
  resolve: {
    alias
  }
})
