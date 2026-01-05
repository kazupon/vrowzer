import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/incoming.ts', './src/outgoing.ts', './src/connect.ts'],
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})
