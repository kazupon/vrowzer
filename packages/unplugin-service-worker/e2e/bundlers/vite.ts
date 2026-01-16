import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { build } from 'vite'

import type { BuildResult } from './types.ts'

const require = createRequire(import.meta.url)

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/vite.mjs')).default

export async function buildWithVite(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  const serviceWorkerPkgPath = dirname(require.resolve('@vrowser/service-worker/package.json'))

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
        input: join(playgroundDir, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@vrowser/service-worker/controller': join(serviceWorkerPkgPath, 'dist/controller.js'),
        '@vrowser/service-worker/worker': join(serviceWorkerPkgPath, 'dist/worker.js'),
        '@vrowser/service-worker/admin': join(serviceWorkerPkgPath, 'dist/admin.js'),
        '@vrowser/service-worker': serviceWorkerPkgPath
      }
    },
    plugins: [ServiceWorker()]
  })

  return { success: true }
}
