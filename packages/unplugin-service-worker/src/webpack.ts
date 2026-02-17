/**
 * Webpack plugin
 *
 * @example
 * ```js
 * // webpack.config.js
 * import ServiceWorker from '@vrowser/unplugin-service-worker/webpack'
 *
 * export default {
 *   plugins: [ServiceWorker()],
 * }
 * ```
 *
 * @module webpack
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

const webpack = ServiceWorkerPlugin.webpack
export default webpack
export { webpack as 'module.exports', wasmUrlPlugin }
