import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/url.ts', './src/util.ts', './src/events.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true
})
