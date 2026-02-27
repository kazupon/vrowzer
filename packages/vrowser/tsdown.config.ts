import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  platform: 'browser',
  entry: ['./src/index.ts'],
  clean: true,
  publint: true,
  dts: true,
  fixedExtension: false
})

export default config
