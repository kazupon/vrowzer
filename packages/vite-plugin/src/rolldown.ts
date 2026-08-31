/**
 * rolldown processing
 *
 * @module rolldown
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDebug } from 'obug'

import type { Plugin } from 'vite'
import type { ResolvedVrowzerOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowzer:rolldown')

export function rewriteRolldownAssetUrls(code: string): string {
  return code.replace(
    /(["'])\.\.\/(rolldown-(?:binding\.wasm32-wasi\.wasm|worker\.js)\?__vrowzer_internal_asset=rolldown)\1/g,
    '$1./$2$1'
  )
}

function renderRolldownAssetChunk(code: string): string | null {
  const rewritten = rewriteRolldownAssetUrls(code)
  return rewritten === code ? null : rewritten
}

export function rolldownWorkerAssetPlugin(): Plugin {
  return {
    name: 'vrowzer:worker-rolldown-assets',
    renderChunk: renderRolldownAssetChunk
  }
}

// Resolve @vrowzer/rolldown dist path for WASM/Worker file copying
const rolldownDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('@vrowzer/rolldown/package.json'))),
  'dist'
)
debug('rolldownDistDir ', rolldownDistDir)

export function rolldownPlugin(_options: ResolvedVrowzerOptions): Plugin {
  let resolvedAssetsDir = ''

  return {
    name: 'vrowzer:rolldown',
    configResolved(config) {
      resolvedAssetsDir = path.resolve(config.root, config.build.outDir, config.build.assetsDir)
    },
    renderChunk: renderRolldownAssetChunk,
    /**
     * Copy rolldown WASM binary and sub-worker for production builds.
     * The worker chunks and these files share the configured assets directory.
     */
    writeBundle() {
      debug('copy-rolldown-wasm: assetsDir ', resolvedAssetsDir)

      const wasmSrc = path.resolve(rolldownDistDir, 'rolldown-binding.wasm32-wasi.wasm')
      debug('copy-rolldown-wasm: wasmSrc ', wasmSrc)

      const workerSrc = path.resolve(rolldownDistDir, 'worker.js')
      debug('copy-rolldown-wasm: workerSrc ', workerSrc)

      if (existsSync(wasmSrc)) {
        copyFileSync(wasmSrc, path.resolve(resolvedAssetsDir, 'rolldown-binding.wasm32-wasi.wasm'))
      }
      if (existsSync(workerSrc)) {
        copyFileSync(workerSrc, path.resolve(resolvedAssetsDir, 'rolldown-worker.js'))
      }
    }
  }
}
