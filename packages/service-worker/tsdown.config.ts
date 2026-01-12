import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/admin.ts', './src/controller.ts', './src/protocols.ts', './src/worker.ts'],
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})
