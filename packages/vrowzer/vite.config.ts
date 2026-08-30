import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    platform: 'browser',
    entry: ['./src/index.ts'],
    tsconfig: './tsconfig.build.json',
    publint: true,
    dts: true,
    fixedExtension: false,
    plugins: [
      {
        // Keep worker entry files next to dist/index.js so URL-based exports resolve.
        name: 'copy-worker-entries',
        writeBundle() {
          const srcDir = resolve(import.meta.dirname, 'src')
          const distDir = resolve(import.meta.dirname, 'dist')
          cpSync(resolve(srcDir, 'web-worker.ts'), resolve(distDir, 'web-worker.ts'))
          cpSync(resolve(srcDir, 'web-worker-core.ts'), resolve(distDir, 'web-worker-core.ts'))
          cpSync(resolve(srcDir, 'service-worker.ts'), resolve(distDir, 'service-worker.ts'))
          cpSync(resolve(srcDir, 'preview-base.ts'), resolve(distDir, 'preview-base.ts'))
          cpSync(
            resolve(srcDir, 'service-worker-version.ts'),
            resolve(distDir, 'service-worker-version.ts')
          )
          cpSync(
            resolve(srcDir, 'service-worker-core.ts'),
            resolve(distDir, 'service-worker-core.ts')
          )
        }
      }
    ]
  },
  test: {
    environment: 'node'
  }
})
