import { readFile, writeFile, copyFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { rolldown } from 'rolldown'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/rolldown.mjs')).default

export async function buildWithRolldown(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  // Build main.js
  const bundle = await rolldown({
    input: join(playgroundDir, 'main.js'),
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    },
    plugins: [ServiceWorker()]
  })

  await bundle.write({
    dir: outputDir,
    format: 'es',
    entryFileNames: 'assets/[name]-[hash].js',
    chunkFileNames: 'assets/[name]-[hash].js'
  })

  await bundle.close()

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
