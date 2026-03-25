import yaml from '@rollup/plugin-yaml'
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [VrowzerManifest(), yaml(), Vrowzer({ auto: false })]
})
