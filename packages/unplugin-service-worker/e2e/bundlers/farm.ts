import { join, basename } from 'node:path'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { build } from '@farmfe/core'
import { rolldown } from 'rolldown'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/farm.mjs')).default

// SW placeholder pattern
const SW_ASSET_RE = /__SW_ASSET__([a-z0-9]+)__/g

// Generate content hash
function generateContentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}

export async function buildWithFarm(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  await build({
    root: playgroundDir,
    compilation: {
      input: {
        index: join(playgroundDir, 'index.html')
      },
      output: {
        path: outputDir,
        publicPath: '/',
        filename: 'assets/[name]-[hash].[ext]',
        assetsFilename: 'assets/[name]-[hash].[ext]',
        targetEnv: 'browser-esnext'
      },
      script: {
        // Target modern browsers to avoid core-js polyfills
        target: 'esnext'
      },
      // Disable presetEnv to avoid core-js dependency
      presetEnv: false,
      minify: false,
      sourcemap: false,
      persistentCache: false
    },
    // @ts-ignore -- for testing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- for testing
    plugins: [ServiceWorker()]
  })

  // Post-build: Bundle SW and replace placeholders
  // This is needed because Farm's unplugin adapter doesn't support renderChunk/generateBundle
  const swPath = join(playgroundDir, 'sw.js')

  // Bundle SW with rolldown
  const bundle = await rolldown({
    input: swPath,
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    }
  })

  const { output } = await bundle.generate({
    format: 'iife',
    sourcemap: false,
    minify: false
  })

  await bundle.close()

  const swChunk = output.find(o => o.type === 'chunk' && o.isEntry)
  if (!swChunk || swChunk.type !== 'chunk') {
    throw new Error('Failed to bundle Service Worker')
  }

  // Generate SW filename with content hash
  const swContentHash = generateContentHash(swChunk.code)
  const swFilename = `sw-${swContentHash}.js`
  const swOutputPath = join(outputDir, 'assets', swFilename)

  // Write SW file
  await mkdir(join(outputDir, 'assets'), { recursive: true })
  await writeFile(swOutputPath, swChunk.code)

  // Replace placeholders in all JS files
  const allFiles = await readdir(outputDir, { recursive: true })

  for (const file of allFiles) {
    if (typeof file !== 'string' || !file.endsWith('.js')) {
      continue
    }

    const filePath = join(outputDir, file)
    let content = await readFile(filePath, 'utf8')

    SW_ASSET_RE.lastIndex = 0
    if (SW_ASSET_RE.test(content)) {
      SW_ASSET_RE.lastIndex = 0
      content = content.replace(SW_ASSET_RE, `/assets/${swFilename}`)
      await writeFile(filePath, content)
    }
  }

  return { success: true }
}
