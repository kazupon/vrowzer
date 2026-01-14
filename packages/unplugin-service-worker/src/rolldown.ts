/**
 * This entry file is for Rolldown plugin.
 *
 * @module rolldown
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

/**
 * Rolldown plugin
 *
 * @example
 * ```ts
 * // rolldown.config.js
 * import Starter from 'unplugin-starter/rolldown'
 *
 * export default {
 *   plugins: [Starter()],
 * }
 * ```
 */
const rolldown = ServiceWorkerPlugin.rolldown
export default rolldown
export { rolldown as 'module.exports' }
