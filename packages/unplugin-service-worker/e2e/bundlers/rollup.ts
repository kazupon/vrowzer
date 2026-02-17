import { readFile, writeFile, copyFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { rollup } from 'rollup'
import nodeResolve from '@rollup/plugin-node-resolve'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/rollup.mjs')).default

export async function buildWithRollup(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  // Build main.js
  const bundle = await rollup({
    input: join(playgroundDir, 'main.js'),
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      ServiceWorker({
        assets: [{ src: join(playgroundDir, 'add.wasm') }]
      })
    ],
    onwarn(warning, warn) {
      // Suppress circular dependency warnings from dependencies
      if (warning.code === 'CIRCULAR_DEPENDENCY') return
      warn(warning)
    }
  })

  await bundle.write({
    dir: outputDir,
    format: 'es',
    entryFileNames: 'assets/[name]-[hash].js',
    chunkFileNames: 'assets/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]'
  })

  await bundle.close()

  // Copy and process HTML manually (Rollup doesn't handle HTML natively)
  const htmlPath = join(playgroundDir, 'index.html')
  let html = await readFile(htmlPath, 'utf-8')

  // Find the generated main.js file
  const assets = await readdir(join(outputDir, 'assets'))
  const mainJs = assets.find(f => f.startsWith('main-') && f.endsWith('.js'))

  if (mainJs) {
    // Replace main.js reference with hashed filename
    html = html.replace('./main.js', `./assets/${mainJs}`)
  }

  await writeFile(join(outputDir, 'index.html'), html)

  // Copy CSS
  await copyFile(join(playgroundDir, 'style.css'), join(outputDir, 'style.css'))

  return { success: true }
}
