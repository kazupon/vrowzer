import { defineConfig } from 'vite-plus'

const config: ReturnType<typeof defineConfig> = defineConfig({
  pack: {
    entry: ['./src/index.ts'],
    platform: 'browser',
    clean: true,
    publint: true,
    dts: true,
    fixedExtension: false
  },
  root: '.',
  publicDir: 'test-public',
  server: {
    port: 5174
  }
})

export default config
