/**
 * Rolldown plugin
 *
 * @example
 * ```ts
 * // rolldown.config.js
 * import ServiceWorker from '@vrowser/unplugin-service-worker/rolldown'
 *
 * export default {
 *   plugins: [ServiceWorker()],
 * }
 * ```
 *
 * @module rolldown
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

const rolldown = ServiceWorkerPlugin.rolldown
export default rolldown
export { rolldown as 'module.exports' }
