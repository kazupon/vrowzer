import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ['./src/admin.ts', './src/controller.ts', './src/protocols.ts', './src/worker.ts'],
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})

export default config
