import { defineConfig } from 'tsdown'
import nodePolyfills from '@rolldown/plugin-node-polyfills'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false,
  external: ['@vrowser/service-worker/worker'],
  plugins: [nodePolyfills()]
})
