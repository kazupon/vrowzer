import { defineConfig } from 'vite-plus'

const config: ReturnType<typeof defineConfig> = defineConfig({
  pack: {
    entry: ['./src/index.ts', './src/manifest-generate.ts'],
    external: ['@vitejs/devtools', 'vite'],
    publint: true,
    dts: true
  },
  test: {
    environment: 'node'
  }
})

export default config
