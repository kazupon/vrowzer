import { defineConfig } from 'tsdown'

const config: ReturnType<typeof defineConfig> = defineConfig([
  {
    platform: 'browser',
    entry: ['./src/preview.ts'],
    publint: true,
    dts: true,
    fixedExtension: false
  },
  {
    platform: 'node',
    entry: ['./src/vite.ts'],
    publint: true,
    dts: true
  }
])

export default config
