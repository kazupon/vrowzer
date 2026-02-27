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
import type { ResolvedVrowserPluginOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:rolldown')

// Resolve @vrowser/rolldown dist path for WASM/Worker file copying
const rolldownDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('@vrowser/rolldown/package.json'))),
  'dist'
)
debug('rolldownDistDir ', rolldownDistDir)

export function rolldownPlugin(_options: ResolvedVrowserPluginOptions): Plugin {
  return {
    name: 'vrowser:rolldown',
    /**
     * NOTE(kazupon):
     * Copy rolldown WASM binary and sub-worker for production builds.
     * The Worker chunk is output to dist/assets/ and references WASM via
     * `new URL("./rolldown-binding.wasm32-wasi.wasm", import.meta.url)`,
     * so the WASM file must be in dist/assets/ alongside the Worker chunk.
     */
    writeBundle() {
      const assetsDir = path.resolve(fileURLToPath(import.meta.url), '../dist/assets')
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
