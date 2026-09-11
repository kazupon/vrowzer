import yaml from '@rollup/plugin-yaml'
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'
import virtualInvalidationPlugin from './virtual-invalidation'

export default defineConfig({
  // Exercise the same dependency optimizer path used by an npm-installed package.
  optimizeDeps: {
    include: ['vrowzer']
  },
  plugins: [VrowzerManifest(), yaml(), virtualInvalidationPlugin(), Vrowzer({ auto: false })]
})
