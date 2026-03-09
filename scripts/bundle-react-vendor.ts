/**
 * This script bundles React and related packages into multiple ESM bundles for use in the Vrowser + React fixture.
 * ref: e2e/fixtures/vite-react
 */

import { rolldown } from 'rolldown'
import { resolve } from 'node:path'

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

console.log('Done: vendor/react.js, vendor/react-dom-client.js, vendor/react-jsx-dev-runtime.js')
