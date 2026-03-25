/**
 * Rollup plugin
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import ServiceWorker from '@vrowzer/unplugin-service-worker/rollup'
 *
 * export default {
 *   plugins: [ServiceWorker()],
 * }
 * ```
 *
 * @module rollup
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

const rollup = ServiceWorkerPlugin.rollup
export default rollup
export { rollup as 'module.exports', wasmUrlPlugin }
