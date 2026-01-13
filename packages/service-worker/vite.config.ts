import path from 'node:path'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import pkg from './package.json' with { type: 'json' }

const __dirname = import.meta.dirname

// collect build targets from `package.json` exports
const targets = Object.keys(pkg.exports).reduce((acc, key) => {
  if (key === './package.json') {
    return acc
  }
  const target = key.split('./').filter(Boolean)[0]
  if (target) {
    acc.push(target)
  }
  return acc
}, [] as string[])

console.log(`Testing @vrowser/service-worker package v${pkg.version}`, targets)

// create `alias` entries for each target
const alias = targets.reduce(
  (acc, target) => {
    const entryPath = path.resolve(__dirname, `./dist/${target}.js`)
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Build entry not found: ${entryPath}`)
    }
    acc[`@vrowser/service-worker/${target}`] = entryPath
    return acc
  },
  {} as Record<string, string>
)

export default defineConfig({
  root: '.',
  publicDir: 'test-public',
  server: {
    port: 5173
  },
  resolve: {
    alias
  }
})
