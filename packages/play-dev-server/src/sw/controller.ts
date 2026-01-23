/**
 * Service Worker Controller
 *
 * Simplified controller for registering and managing Service Worker lifecycle.
 */

/**
 * Get Service Worker URL based on environment
 */
function getServiceWorkerUrl(): string {
  const base = '/src/sw/'
  const devPath = base + 'sw.ts'
  return import.meta.env.DEV ? devPath : import.meta.env.VITE_BROWSER_SW_PATH
}

/**
 * Register Service Worker and wait for it to be active
 */
async function registerServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW Controller] Service Worker not supported')
    return null
  }

  const url = getServiceWorkerUrl()
  console.log('[SW Controller] Registering Service Worker from:', url)

  try {
    const registration = await navigator.serviceWorker.register(url, {
      type: 'module',
      scope: '/'
    })
    console.log('[SW Controller] Service Worker registered:', registration.scope)

    const serviceWorker = await waitForServiceWorkerActive(registration)
    return serviceWorker
  } catch (error) {
    console.error('[SW Controller] Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Wait for Service Worker to be active
 */
function waitForServiceWorkerActive(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorker> {
  return new Promise((resolve, reject) => {
    if (registration.installing) {
      console.log('[SW Controller] Service Worker is installing...')
      waitForActivation(registration.installing, resolve, reject)
      return
    }

    if (registration.waiting) {
      console.log('[SW Controller] Service Worker is waiting...')
      waitForActivation(registration.waiting, resolve, reject)
      return
    }

    if (registration.active) {
      console.log('[SW Controller] Service Worker already active')
      resolve(registration.active)
      return
    }

    reject(new Error('No service worker found'))
  })
}

/**
 * Wait for a specific Service Worker to activate
 */
function waitForActivation(
  serviceWorker: ServiceWorker,
  resolve: (sw: ServiceWorker) => void,
  reject: (error: Error) => void
) {
  if (serviceWorker.state === 'activated') {
    resolve(serviceWorker)
    return
  }

  serviceWorker.addEventListener('statechange', () => {
    console.log('[SW Controller] Service Worker state:', serviceWorker.state)
    if (serviceWorker.state === 'activated') {
      resolve(serviceWorker)
    }
  })

  serviceWorker.addEventListener('error', event => {
    reject(new Error(`Service Worker error: ${event}`))
  })
}

// Active Service Worker reference
let activeServiceWorker: ServiceWorker | null = null

/**
 * Get the active Service Worker
 */
export function getServiceWorker(): ServiceWorker | null {
  return activeServiceWorker || navigator.serviceWorker?.controller || null
}

/**
 * Initialize Service Worker
 */
export async function initServiceWorker(): Promise<void> {
  console.log('[SW Controller] Initializing...')

  const serviceWorker = await registerServiceWorker()
  if (serviceWorker) {
    activeServiceWorker = serviceWorker
    console.log('[SW Controller] Service Worker is active:', serviceWorker.state)
  }
}
