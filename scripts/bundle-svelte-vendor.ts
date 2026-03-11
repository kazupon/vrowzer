/**
 * This script bundles Svelte and related packages into ESM bundles for use in the Vrowser + Svelte fixture.
 * ref: packages/play-vrowser/fixtures/vite-svelte
 */

import { rolldown } from 'rolldown'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixtureDir = resolve(root, 'packages/play-vrowser/fixtures/vite-svelte')
const vendorDir = resolve(fixtureDir, 'vendor')
const entriesDir = resolve(fixtureDir, '_vendor-entries')
const svelteNodeModules = resolve(root, 'packages/play-vrowser/node_modules')

const bundle = await rolldown({
  input: {
    svelte: resolve(entriesDir, 'svelte.ts'),
    'svelte-internal-client': resolve(entriesDir, 'svelte-internal-client.ts')
  },
  resolve: {
    conditionNames: ['browser', 'import', 'default'],
    modules: [svelteNodeModules, 'node_modules']
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
  chunkFileNames: 'svelte-shared.js',
  minify: false
})

console.log('Done: vendor/svelte.js, vendor/svelte-internal-client.js')
