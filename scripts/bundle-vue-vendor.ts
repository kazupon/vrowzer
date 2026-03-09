/**
 * This script bundles Vue and related packages into a single ESM bundle for use in the Vrowser + Vue fixture.
 * ref: e2e/fixtures/vite-vue
 */

import { rolldown } from 'rolldown'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const vendorDir = resolve(root, 'e2e/fixtures/vite-vue/vendor')
const vueNodeModules = resolve(root, 'packages/play-vrowser/node_modules')

// Bundle vue.esm-bundler.js as a single ESM vendor file.
// Uses development mode to include devtools hooks and warnings.
const bundle = await rolldown({
  input: resolve(vueNodeModules, 'vue/dist/vue.esm-bundler.js'),
  resolve: {
    conditionNames: ['browser', 'import', 'default'],
    modules: [vueNodeModules, 'node_modules']
  },
  transform: {
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    }
  }
})
await bundle.write({
  format: 'esm',
  dir: vendorDir,
  entryFileNames: 'vue.js',
  minify: false
})

console.log('Done: vendor/vue.js')
