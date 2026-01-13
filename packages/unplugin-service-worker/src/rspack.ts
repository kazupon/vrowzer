/**
 * This entry file is for Rspack plugin.
 *
 * @module
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Starter } from './index.ts'

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
const rspack = Starter.rspack
export default rspack
export { rspack as 'module.exports' }
