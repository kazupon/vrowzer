/**
 * This entry file is for esbuild plugin.
 *
 * @module
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Starter } from './index.ts'

/**
 * Esbuild plugin
 *
 * @example
 * ```ts
 * import { build } from 'esbuild'
 * import Starter from 'unplugin-starter/esbuild'
 *
 * build({ plugins: [Starter()] })
```
 */
const esbuild = Starter.esbuild
export default esbuild
export { esbuild as 'module.exports' }
