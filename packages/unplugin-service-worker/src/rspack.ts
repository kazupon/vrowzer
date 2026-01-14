/**
 * This entry file is for Rspack plugin.
 *
 * @module
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

/**
 * Rspack plugin
 *
 * @example
 * ```js
 * // rspack.config.js
 * import Starter from 'unplugin-starter/rspack'
 *
 * export default {
 *   plugins: [Starter()],
 * }
 * ```
 */
const rspack = ServiceWorkerPlugin.rspack
export default rspack
export { rspack as 'module.exports' }
