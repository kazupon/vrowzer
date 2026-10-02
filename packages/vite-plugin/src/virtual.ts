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
 * SPIKE (#36): the build Worker entry. The config module exports a function that creates the
 * config, which the build Worker calls for each build.
 */
export function generateBuildWorkerEntry(configPath: string): string {
  return `
import { initBuildWorker } from 'vrowzer/build-worker-core'
import createConfig from ${JSON.stringify(configPath.replaceAll('\\', '/'))}
initBuildWorker(async () => {
  const config = await createConfig()
  const workerConfig = config?.default ?? config
  if (!workerConfig || typeof workerConfig !== 'object' || Array.isArray(workerConfig)) {
    throw new Error('[vrowzer] Worker config must export a config object')
  }
  return { ...workerConfig }
})
`
}
