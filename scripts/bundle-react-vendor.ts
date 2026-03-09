/**
 * This script bundles React and related packages into multiple ESM bundles for use in the Vrowser + React fixture.
 * ref: e2e/fixtures/vite-react
 */

import { rolldown } from 'rolldown'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '..')
const fixtureDir = resolve(root, 'e2e/fixtures/vite-react')
const vendorDir = resolve(fixtureDir, 'vendor')
const entriesDir = resolve(fixtureDir, '_vendor-entries')
const reactNodeModules = resolve(root, 'node_modules')

// Bundle all React entries together so they share the same React internals.
// jsx-dev-runtime needs development mode, but react/react-dom use production.
// Solution: bundle with development mode (for jsxDEV), React itself handles
// production/development branching internally via process.env.NODE_ENV checks
// which are already resolved at bundle time.
const bundle = await rolldown({
  input: {
    react: resolve(entriesDir, 'react.ts'),
    'react-dom-client': resolve(entriesDir, 'react-dom-client.ts'),
    'react-jsx-dev-runtime': resolve(entriesDir, 'react-jsx-dev-runtime.ts')
  },
  resolve: {
    conditionNames: ['browser', 'import', 'default'],
    modules: [reactNodeModules, 'node_modules']
  },
  transform: {
    define: {
      'process.env.NODE_ENV': JSON.stringify('development')
    }
  }
})
await bundle.write({
  format: 'esm',
  dir: vendorDir,
  entryFileNames: '[name].js',
  chunkFileNames: 'react-shared.js',
  minify: false
})

// Copy react-refresh-runtime.js from @vitejs/plugin-react (with __README_URL__ replaced)
const require = createRequire(import.meta.url)
const pluginReactDir = resolve(
  require.resolve('@vitejs/plugin-react', {
    paths: [resolve(root, 'packages/play-vrowser')]
  }),
  '..'
)
const refreshRuntime = readFileSync(resolve(pluginReactDir, 'refresh-runtime.js'), 'utf-8').replace(
  /__README_URL__/g,
  'https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react'
)
writeFileSync(resolve(vendorDir, 'react-refresh-runtime.js'), refreshRuntime)

console.log(
  'Done: vendor/react.js, vendor/react-dom-client.js, vendor/react-jsx-dev-runtime.js, vendor/react-refresh-runtime.js'
)
