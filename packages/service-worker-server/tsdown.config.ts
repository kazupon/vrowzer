import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ['./src/index.ts'],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})

export default config
