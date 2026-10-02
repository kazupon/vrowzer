/**
 * Worker entry generation for vrowzer
 *
 * Generates source code for Worker entries that import vrowzer's factory functions
 * and the user's config to inject user plugins into Workers.
 *
 * @module virtual
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Alias } from './options.ts'

export function generateWebWorkerEntry(configPath: string, resolve?: { alias?: Alias[] }): string {
  const resolveBlock = resolve
    ? `\nconst workerResolve = ${JSON.stringify(resolve)}\nObject.assign(resolved, { resolve: workerResolve })`
    : ''

  return `
import { initWebWorker } from 'vrowzer/web-worker-core'
import config from ${JSON.stringify(configPath.replaceAll('\\', '/'))}
const workerConfig = config?.default ?? config
if (!workerConfig || typeof workerConfig !== 'object' || Array.isArray(workerConfig)) {
  throw new Error('[vrowzer] Worker config must export a config object')
}
const resolved = { ...workerConfig }
${resolveBlock}
initWebWorker(resolved)
`
}

/**
 * Generates the entry of the build Worker of `vrowzer.build()`, which passes the Worker config
 * bundled for production builds.
 */
export function generateBuildWorkerEntry(
  configPath: string,
  resolve?: { alias?: Alias[] }
): string {
  const resolveBlock = resolve
    ? `\nconst workerResolve = ${JSON.stringify(resolve)}\nObject.assign(resolved, { resolve: workerResolve })`
    : ''

  return `
import { initBuildWorker } from 'vrowzer/build-worker-core'
import config from ${JSON.stringify(configPath.replaceAll('\\', '/'))}
const workerConfig = config?.default ?? config
if (!workerConfig || typeof workerConfig !== 'object' || Array.isArray(workerConfig)) {
  throw new Error('[vrowzer] Worker config must export a config object')
}
const resolved = { ...workerConfig }
${resolveBlock}
initBuildWorker(resolved)
`
}

/**
 * Generates the entry of the build Worker when `vrowzer.build()` is not enabled.
 *
 * The runtime does not create the build Worker then. The stub keeps the builder out of the host
 * output, and reports `V_BW_READY` with an error in case the Worker is created anyway.
 */
export function generateDisabledBuildWorkerEntry(): string {
  return `
self.postMessage({
  type: 'V_BW_READY',
  error: '[vrowzer] vrowzer.build() is not enabled. Set build: true in the options of the Vrowzer plugin.'
})
`
}
