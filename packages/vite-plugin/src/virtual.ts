/**
 * Worker entry generation for vrowser
 *
 * Generates source code for Worker entries that import vrowser's factory functions
 * and the user's vrowser.config.ts to inject user plugins into Workers.
 *
 * @module virtual
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export function generateWebWorkerEntry(configPath: string): string {
  return `
import { initWebWorker } from 'vrowser/web-worker-core'
import config from '${configPath}'
const resolved = config.default ?? config
initWebWorker(resolved)
`
}

// TODO(kazupon): Re-enable when SW-specific configureServer plugins are needed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for future SW plugin injection
export function generateServiceWorkerEntry(configPath: string): string {
  return `
import { initServiceWorker } from 'vrowser/service-worker-core'
import config from '${configPath}'
initServiceWorker({ plugins: config.default?.plugins ?? config.plugins ?? [] })
`
}
