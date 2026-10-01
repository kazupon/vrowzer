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
import { abortable } from './abort.ts'

import type { SvcWorkerController } from '@vrowzer/service-worker/controller'

let controller: SvcWorkerController | null = null
let serviceWorkerInstanceId: string | null = null

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
 * Get the ID of the Service Worker instance that answered the last {@link initServiceWorker}.
 * The Service Worker creates a new ID each time its script is evaluated, so a different ID means
 * that the browser restarted the Service Worker process.
 */
export function getServiceWorkerInstanceId(): string | null {
  return serviceWorkerInstanceId
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
  readyTimeout: number
  listenReadyTimeout?: number
  /**
   * Aborts initialization: the returned promise rejects with `signal.reason`, and the
   * `listen()` polling stops. The controller is shared within the page, so its own `ready()`
   * wait is not cancelled; its result is ignored.
   */
  signal?: AbortSignal
}): Promise<SvcWorkerController> {
  const { signal } = options
  signal?.throwIfAborted()

  controller = createSvcWorkerController({
    scriptURL: options.scriptURL,
    version: options.version,
    scope: options.scope,
    type: 'module'
  })

  const ready = await abortable(
    controller.ready({
      timeout: options.readyTimeout,
      skipWaitingPolicy: 'force',
      waitForController: true
    }),
    signal
  )
  if (!ready) {
    throw new Error(
      `Service Worker controller did not become ready within ${options.readyTimeout}ms`
    )
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
  // The signal may have been aborted while the controller's ready() result was being delivered
  signal?.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer)
      clearInterval(pollId)
      container.removeEventListener('message', handler)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      stop()
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      stop()
      reject(new Error(`Service Worker listen() did not complete within ${timeout}ms`))
    }, timeout)

    const handler = (event: MessageEvent) => {
      if (event.data?.type === V_SW_LISTEN_READY) {
        const { instanceId } = event.data
        serviceWorkerInstanceId = typeof instanceId === 'string' ? instanceId : null
        stop()
        resolve()
      }
    }
    container.addEventListener('message', handler)
    signal?.addEventListener('abort', onAbort, { once: true })

    // Poll: Service Worker responds to ping only after listen() completes
    const pollId = setInterval(() => {
      serviceWorker.postMessage({ type: V_SW_LISTEN_READY_PING })
    }, 500)
    serviceWorker.postMessage({ type: V_SW_LISTEN_READY_PING })
  })

  return controller
}
