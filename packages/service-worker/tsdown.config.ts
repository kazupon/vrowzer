import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/controller.ts', './src/worker.ts', './src/protocols.ts'],
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})
