/**
 * This entry file is for Vite plugin.
 *
 * @module vite
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

/**
 * Vite plugin for Service Worker bundling
 *
 * Detects `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
 * patterns and bundles Service Worker files.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import ServiceWorker from '@anthropic/unplugin-service-worker/vite'
 *
 * export default defineConfig({
 *   plugins: [ServiceWorker()],
 * })
 * ```
 */
const vite = ServiceWorkerPlugin.vite
export default vite
export { vite as 'module.exports' }
