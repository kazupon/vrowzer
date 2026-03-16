import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig({
  entry: ['./src/index.ts', './src/manifest-generate.ts'],
  publint: true,
  dts: true
})

export default config
