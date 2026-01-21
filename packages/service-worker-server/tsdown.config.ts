import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})
