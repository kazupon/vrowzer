/**
 * Service Worker Controller
 *
 * Manages Service Worker lifecycle for the vrowzer preview system.
 *
 * @module controller
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createSvcWorkerController } from '@vrowzer/service-worker/controller'
import { V_SW_LISTEN_READY, V_SW_LISTEN_READY_PING } from '@vrowzer/vite-dev-server/messages'

import type { SvcWorkerController } from '@vrowzer/service-worker/controller'

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
 * Initialize Service Worker and wait for it to be fully ready.
 *
 * "Fully ready" means:
 * 1. Service Worker is activated and controlling the page (via controller.ready())
 * 2. Service Worker's Vite dev server has finished initializing (listen() completed)
 *
 * The second condition is checked by polling V_SW_LISTEN_READY_PING messages
 * to the Service Worker, which responds with V_SW_LISTEN_READY when listen() has completed.
 */
export async function initServiceWorker(options: {
  scriptURL: URL
  version: string
  scope: string
  listenReadyTimeout?: number
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

  // Wait for Service Worker's listen() to complete (listenConnections registered).
  // Service worker processes are ephemeral — the browser can restart them at any time.
  // listen() runs at the top level of the Service Worker script, so it executes on every
  // process start. We poll until the Service Worker confirms it's ready.
  const serviceWorker = controller.serviceWorker
  if (!serviceWorker) {
    throw new Error('Service Worker is not available after ready()')
  }

  const container = controller.container
  const timeout = options.listenReadyTimeout ?? 30000
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      clearInterval(pollId)
      container.removeEventListener('message', handler)
      reject(new Error(`Service Worker listen() did not complete within ${timeout}ms`))
    }, timeout)

    const handler = (event: MessageEvent) => {
      if (event.data?.type === V_SW_LISTEN_READY) {
        clearTimeout(timer)
        clearInterval(pollId)
        container.removeEventListener('message', handler)
        resolve()
      }
    }
    container.addEventListener('message', handler)

    // Poll: Service Worker responds to ping only after listen() completes
    const pollId = setInterval(() => {
      serviceWorker.postMessage({ type: V_SW_LISTEN_READY_PING })
    }, 500)
    serviceWorker.postMessage({ type: V_SW_LISTEN_READY_PING })
  })

  return controller
}
