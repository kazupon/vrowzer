import { copyFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./js/index.ts'],
  outDir: './dist',
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true,
  onSuccess() {
    copyFileSync('./pkg/vrowser_oxc_parser_bg.wasm', './dist/vrowser_oxc_parser_bg.wasm')
  }
})
