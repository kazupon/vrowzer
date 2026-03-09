import path from 'node:path'
import { copyFile, readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { build, NoopLogger } from '@farmfe/core'
import { rolldown } from 'rolldown'

import type { BuildResult } from './types.ts'

// Suppress Farm's build logs unless E2E_DEBUG is set
const logger = process.env.E2E_DEBUG ? undefined : new NoopLogger()

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
    logger,
    compilation: {
      input: {
        index: path.join(playgroundDir, 'index.html')
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
      persistentCache: false,
      define: { __SW_TYPE__: JSON.stringify('classic') }
    },
    // @ts-ignore -- for testing

    plugins: [
      ServiceWorker({
        assets: [{ src: path.join(playgroundDir, 'add.wasm') }]
      })
    ]
  })

  // Post-build: Bundle SW and replace placeholders
  // This is needed because Farm's unplugin adapter doesn't support renderChunk/generateBundle
  const swPath = path.join(playgroundDir, 'sw.js')

  // Bundle SW with rolldown (with WASM inline support)
  const { wasmInlinePlugin, inlineWasmInCode } = (await import('../../dist/index.mjs')) as {
    wasmInlinePlugin: () => import('rolldown').Plugin & { readonly _wasmFiles: Map<string, string> }
    inlineWasmInCode: (code: string, wasmFiles: Map<string, string>) => Promise<string>
  }
  const wasmPlugin = wasmInlinePlugin()
  const bundle = await rolldown({
    input: swPath,
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    },
    plugins: [wasmPlugin],
    transform: {
      define: {
        'import.meta.env': '{}',
        'import.meta': '{}'
      }
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

  // Post-process: inline WASM files as base64 data URLs
  let swCode = swChunk.code
  const wasmFiles = wasmPlugin._wasmFiles
  if (wasmFiles.size > 0) {
    swCode = await inlineWasmInCode(swCode, wasmFiles)
  }

  // Generate SW filename with content hash
  const swContentHash = generateContentHash(swCode)
  const swFilename = `sw-${swContentHash}.js`
  const swOutputPath = path.join(outputDir, 'assets', swFilename)

  // Write SW file
  await mkdir(path.join(outputDir, 'assets'), { recursive: true })
  await writeFile(swOutputPath, swCode)

  // Copy assets alongside the SW bundle
  const addWasmSrc = path.join(playgroundDir, 'add.wasm')
  await copyFile(addWasmSrc, path.join(outputDir, 'assets', 'add.wasm'))

  // Replace placeholders in all JS files
  const allFiles = await readdir(outputDir, { recursive: true })

  for (const file of allFiles) {
    if (typeof file !== 'string' || !file.endsWith('.js')) {
      continue
    }

    const filePath = path.join(outputDir, file)
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
