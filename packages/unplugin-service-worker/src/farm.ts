/**
 * Farm plugin
 *
 * @example
 * ```ts
 * // farm.config.js
 * import ServiceWorker from '@vrowzer/unplugin-service-worker/farm'
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

import { ServiceWorkerPlugin, wasmUrlPlugin } from './index.ts'

import type { Options } from './core/options.ts'

// @ts-expect-error FIXME:
const farm: (options?: Options) => unknown[] = ServiceWorkerPlugin.farm
export default farm
export { farm as 'module.exports', wasmUrlPlugin }
