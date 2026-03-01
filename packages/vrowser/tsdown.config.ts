import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  platform: 'browser',
  entry: ['./src/index.ts'],
  publint: true,
  dts: true,
  fixedExtension: false,
  plugins: [
    {
      // Copy Worker entry files to dist/ so that `new URL('./web-worker.ts', import.meta.url)`
      // resolves correctly when index.js is in dist/
      name: 'copy-worker-entries',
      writeBundle() {
        const srcDir = resolve(import.meta.dirname, 'src')
        const distDir = resolve(import.meta.dirname, 'dist')
        cpSync(resolve(srcDir, 'web-worker.ts'), resolve(distDir, 'web-worker.ts'))
        cpSync(resolve(srcDir, 'service-worker.ts'), resolve(distDir, 'service-worker.ts'))
      }
    }
  ]
})
