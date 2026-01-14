/**
 * This entry file is for webpack plugin.
 *
 * @module webpack
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

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
const webpack = ServiceWorkerPlugin.webpack
export default webpack
export { webpack as 'module.exports' }
