import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/url.ts', './src/util.ts', './src/util.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true
})
