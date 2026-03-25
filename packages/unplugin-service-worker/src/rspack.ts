/**
 * Rspack plugin
 *
 * @example
 * ```js
 * // rspack.config.js
 * import ServiceWorker from '@vrowzer/unplugin-service-worker/rspack'
 *
 * export default {
 *   plugins: [ServiceWorker()],
 * }
 * ```
 *
 * @module rspack
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

const rspack = ServiceWorkerPlugin.rspack
export default rspack
export { rspack as 'module.exports', wasmUrlPlugin }
