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

// Resolve @vrowzer/rolldown dist path for WASM/Worker file copying
const rolldownDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('@vrowzer/rolldown/package.json'))),
  'dist'
)
debug('rolldownDistDir ', rolldownDistDir)

export function rolldownPlugin(_options: ResolvedVrowzerOptions): Plugin {
  let resolvedOutDir = ''

  return {
    name: 'vrowzer:rolldown',
    configResolved(config) {
      resolvedOutDir = path.resolve(config.root, config.build.outDir)
    },
    /**
     * Copy rolldown WASM binary and sub-worker for production builds.
     * Both the chunk and WASM/worker files end up in dist/assets/.
     */
    writeBundle() {
      const assetsDir = path.resolve(resolvedOutDir, 'assets')
      debug('copy-rolldown-wasm: assetsDir ', assetsDir)

      const wasmSrc = path.resolve(rolldownDistDir, 'rolldown-binding.wasm32-wasi.wasm')
      debug('copy-rolldown-wasm: wasmSrc ', wasmSrc)

      const workerSrc = path.resolve(rolldownDistDir, 'worker.js')
      debug('copy-rolldown-wasm: workerSrc ', workerSrc)

      if (existsSync(wasmSrc)) {
        copyFileSync(wasmSrc, path.resolve(assetsDir, 'rolldown-binding.wasm32-wasi.wasm'))
      }
      if (existsSync(workerSrc)) {
        copyFileSync(workerSrc, path.resolve(assetsDir, 'rolldown-worker.js'))
      }
    }
  }
}
