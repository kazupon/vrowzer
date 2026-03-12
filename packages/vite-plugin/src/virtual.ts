/**
 * Worker entry generation for vrowser
 *
 * Generates source code for Worker entries that import vrowser's factory functions
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
import { initWebWorker } from 'vrowser/web-worker-core'
import config from '${configPath}'
const resolved = config.default ?? config
${resolveBlock}
initWebWorker(resolved)
`
}
