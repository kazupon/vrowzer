/**
 * This entry file is for Farm plugin.
 *
 * @module farm
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Starter } from './index.ts'

/**
 * Farm plugin
 *
 * @example
 * ```ts
 * // farm.config.js
 * import Starter from 'unplugin-starter/farm'
 *
 * export default {
 *   plugins: [Starter()],
 * }
 * ```
 */
const farm = Starter.farm
export default farm
export { farm as 'module.exports' }
