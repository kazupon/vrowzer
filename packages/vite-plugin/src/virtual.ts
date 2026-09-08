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
