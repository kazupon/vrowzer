/**
 * Esbuild plugin
 *
 * @example
 * ```ts
 * import { build } from 'esbuild'
 * import ServiceWorker from '@vrowzer/unplugin-service-worker/esbuild'
 *
 * build({ plugins: [ServiceWorker()] })
 * ```
 *
 * @module esbuild
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

const esbuild = ServiceWorkerPlugin.esbuild
export default esbuild
export { esbuild as 'module.exports', wasmUrlPlugin }
