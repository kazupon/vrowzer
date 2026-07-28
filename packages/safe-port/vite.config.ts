import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['./src/index.ts'],
    clean: true,
    publint: true,
    dts: true,
    fixedExtension: false
  }
})
