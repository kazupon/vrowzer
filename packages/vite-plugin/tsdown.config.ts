import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ['./src/index.ts', './src/config.ts'],
  publint: true,
  dts: true
})

export default config
