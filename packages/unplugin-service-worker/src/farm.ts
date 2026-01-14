/**
 * Farm plugin
 *
 * @example
 * ```ts
 * // farm.config.js
 * import ServiceWorker from '@vrowser/unplugin-service-worker/farm'
 *
 * export default {
 *   plugins: [ServiceWorker()],
 * }
 * ```
 *
 * @module farm
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

const farm = ServiceWorkerPlugin.farm
export default farm
export { farm as 'module.exports' }
