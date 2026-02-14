import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/url.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true
})
