/**
 * Service Worker Controller
 *
 * Controller for managing Service Worker lifecycle using @vrowser/service-worker/controller.
 */

import { createSvcWorkerController } from '@vrowser/service-worker/controller'

import type { SvcWorkerController } from '@vrowser/service-worker/controller'

const SW_VERSION = 'play-dev-server-v1'

// Active controller reference
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
export async function initServiceWorker(): Promise<SvcWorkerController> {
  console.log('[SW Controller] Initializing...')

  controller = createSvcWorkerController({
    scriptURL: new URL('./sw.ts', import.meta.url),
    version: SW_VERSION,
    scope: '/',
    type: 'module'
  })

  controller.on('changeState', info => {
    console.log('[SW Controller] State:', info.state)
  })

  controller.on('progress', phase => {
    console.log('[SW Controller] Progress:', phase)
  })

  const ready = await controller.ready({
    timeout: 10000,
    skipWaitingPolicy: 'force',
    waitForController: true
  })
  if (!ready) {
    throw new Error('Service Worker failed to become ready')
  }

  console.log('[SW Controller] Service Worker is active:', controller.state)
  return controller
}
