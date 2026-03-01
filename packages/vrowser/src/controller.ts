/**
 * Service Worker Controller
 *
 * Manages Service Worker lifecycle for the vrowser preview system.
 *
 * @module controller
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createSvcWorkerController } from '@vrowser/service-worker/controller'

import type { SvcWorkerController } from '@vrowser/service-worker/controller'

let controller: SvcWorkerController | null = null

/**
 * Get the active Service Worker Controller
 */
export function getController(): SvcWorkerController | null {
  return controller
}

/**
 * Get the active Service Worker
 */
export function getServiceWorker(): ServiceWorker | null {
  return controller?.serviceWorker ?? null
}

/**
 * Initialize Service Worker
 */
export async function initServiceWorker(options: {
  scriptURL: URL
  version: string
  scope: string
}): Promise<SvcWorkerController> {
  controller = createSvcWorkerController({
    scriptURL: options.scriptURL,
    version: options.version,
    scope: options.scope,
    type: 'module'
  })

  const ready = await controller.ready({
    timeout: 10000,
    skipWaitingPolicy: 'force',
    waitForController: true
  })
  if (!ready) {
    throw new Error('Service Worker failed to become ready')
  }

  return controller
}
