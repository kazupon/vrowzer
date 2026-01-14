/**
 * Rollup plugin
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import ServiceWorker from '@vrowser/unplugin-service-worker/rollup'
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

import { ServiceWorkerPlugin } from './index.ts'

const rollup = ServiceWorkerPlugin.rollup
export default rollup
export { rollup as 'module.exports' }
