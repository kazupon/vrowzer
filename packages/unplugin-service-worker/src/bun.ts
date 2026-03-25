/**
 * Bun plugin
 *
 * Bun uses an esbuild-compatible plugin API, so we use the esbuild plugin.
 *
 * @example
 * ```ts
 * import ServiceWorker from '@vrowzer/unplugin-service-worker/bun'
 *
 * Bun.build({
 *   entrypoints: ['./src/main.ts'],
 *   outdir: './dist',
 *   plugins: [ServiceWorker()]
 * })
 * ```
 *
 * @module bun
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

// Bun uses an esbuild-compatible plugin API
const bun = ServiceWorkerPlugin.esbuild
export default bun
export { bun as 'module.exports', wasmUrlPlugin }
