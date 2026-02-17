import path from 'node:path'
import { build } from 'vite'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/vite.mjs')).default

export async function buildWithVite(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  await build({
    root: playgroundDir,
    base: '/',
    logLevel: 'warn',
    build: {
      outDir: outputDir,
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      rollupOptions: {
        input: path.join(playgroundDir, 'index.html')
      }
    },
    plugins: [
      ServiceWorker({
        assets: [{ src: path.join(playgroundDir, 'add.wasm') }]
      })
    ]
  })

  return { success: true }
}
