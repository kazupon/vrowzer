import { readFile, writeFile, copyFile, readdir, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/bun.mjs')).default

export async function buildWithBun(playgroundDir: string, outputDir: string): Promise<BuildResult> {
  // Check if running in Bun runtime
  // @ts-ignore -- Bun global
  if (typeof globalThis.Bun === 'undefined') {
    return {
      success: false,
      error: new Error('Bun runtime is required for this test')
    }
  }

  await mkdir(join(outputDir, 'assets'), { recursive: true })

  // @ts-ignore -- Bun global
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- for testing
  const result = await globalThis.Bun.build({
    entrypoints: [join(playgroundDir, 'main.js')],
    outdir: join(outputDir, 'assets'),
    naming: '[name]-[hash].[ext]',
    format: 'esm',
    target: 'browser',
    minify: false,
    define: { __SW_TYPE__: JSON.stringify('module') },
    sourcemap: 'none',
    plugins: [
      ServiceWorker({
        assets: [{ src: join(playgroundDir, 'add.wasm') }]
      })
    ]
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- for testing
  if (!result.success) {
    return {
      success: false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- for testing
      error: new Error(result.logs.map((l: { message: string }) => l.message).join('\n'))
    }
  }

  // HTML processing
  const htmlPath = join(playgroundDir, 'index.html')
  let html = await readFile(htmlPath, 'utf-8')
  const assets = await readdir(join(outputDir, 'assets'))
  const mainJs = assets.find(f => f.startsWith('main-') && f.endsWith('.js'))
  if (mainJs) {
    html = html.replace('./main.js', `./assets/${mainJs}`)
  }
  await writeFile(join(outputDir, 'index.html'), html)
  await copyFile(join(playgroundDir, 'style.css'), join(outputDir, 'style.css'))

  return { success: true }
}
