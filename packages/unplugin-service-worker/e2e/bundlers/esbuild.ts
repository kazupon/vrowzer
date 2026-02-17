import { readFile, writeFile, copyFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

import type { BuildResult } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/esbuild.mjs')).default

export async function buildWithEsbuild(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  // Build main.js
  await esbuild.build({
    entryPoints: [join(playgroundDir, 'main.js')],
    bundle: true,
    format: 'esm',
    absWorkingDir: join(__dirname, '..'),
    outdir: join(outputDir, 'assets'),
    entryNames: '[name]-[hash]',
    chunkNames: '[name]-[hash]',
    splitting: true,
    minify: false,
    sourcemap: false,
    platform: 'browser',
    conditions: ['browser', 'import', 'module', 'default'],
    metafile: true,
    plugins: [
      ServiceWorker({
        assets: [{ src: join(playgroundDir, 'add.wasm') }]
      })
    ]
  })

  // Copy and process HTML manually
  const htmlPath = join(playgroundDir, 'index.html')
  let html = await readFile(htmlPath, 'utf-8')

  // Find the generated main.js file
  const assets = await readdir(join(outputDir, 'assets'))
  const mainJs = assets.find(f => f.startsWith('main-') && f.endsWith('.js'))

  if (mainJs) {
    html = html.replace('./main.js', `./assets/${mainJs}`)
  }

  await writeFile(join(outputDir, 'index.html'), html)

  // Copy CSS
  await copyFile(join(playgroundDir, 'style.css'), join(outputDir, 'style.css'))

  return { success: true }
}
