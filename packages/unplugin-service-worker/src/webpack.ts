/**
 * This entry file is for webpack plugin.
 *
 * @module
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Starter } from './index.ts'

/**
 * Webpack plugin
 *
 * @example
 * ```js
 * // webpack.config.js
 * import Starter from 'unplugin-starter/webpack'
 *
 * export default {
 *   plugins: [Starter()],
 * }
 * ```
 */
const webpack = Starter.webpack
export default webpack
export { webpack as 'module.exports' }
