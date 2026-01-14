/**
 * This entry file is for Rollup plugin.
 *
 * @module rollup
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

/**
 * Rollup plugin
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import Starter from 'unplugin-starter/rollup'
 *
 * export default {
 *   plugins: [Starter()],
 * }
 * ```
 */
const rollup = ServiceWorkerPlugin.rollup
export default rollup
export { rollup as 'module.exports' }
