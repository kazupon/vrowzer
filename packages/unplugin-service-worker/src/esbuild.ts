/**
 * This entry file is for esbuild plugin.
 *
 * @module esbuild
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { ServiceWorkerPlugin } from './index.ts'

/**
 * Esbuild plugin
 *
 * @example
 * ```ts
 * import { build } from 'esbuild'
 * import Starter from 'unplugin-starter/esbuild'
 *
 * build({ plugins: [Starter()] })
 * ```
 */
const esbuild = ServiceWorkerPlugin.esbuild
export default esbuild
export { esbuild as 'module.exports' }
