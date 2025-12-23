import { createApp } from 'vue'
import App from './App.vue'
import { createLogger } from './logger.ts'
import './style.css'

import type { Component } from 'vue'

const logger = createLogger('main')

/**
 * Register Service Worker and wait for it to be active
 */
async function registerServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    logger.debug('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/src/sw/sw.ts', {
      type: 'module',
      scope: '/'
    })
    logger.debug('Service Worker registered:', registration.scope)

    // Wait for the service worker to be active
    const serviceWorker = await waitForServiceWorkerActive(registration)
    return serviceWorker
  } catch (error) {
    logger.debug('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Wait for Service Worker to be active using registration object
 * If a new SW is installing, wait for it to activate
 */
function waitForServiceWorkerActive(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorker> {
  return new Promise((resolve, reject) => {
    logger.debug('Checking Service Worker state: installing', registration.installing)
    logger.debug('Checking Service Worker state: waiting', registration.waiting)
    logger.debug('Checking Service Worker state: active', registration.active)

    // If there's an installing Service Worker, wait for it to become active
    // This is important during development when the script changes
    if (registration.installing) {
      logger.debug('New Service Worker is installing, waiting for activation...')
      waitForServiceWorkerActivation(registration.installing, resolve, reject)
      return
    }

    // If there's a waiting Service Worker, it will activate after skipWaiting()
    if (registration.waiting) {
      logger.debug('Service Worker is waiting, waiting for activation...')
      waitForServiceWorkerActivation(registration.waiting, resolve, reject)
      return
    }

    // Check if already active (and no new version installing)
    if (registration.active) {
      logger.debug('Service Worker already active')
      resolve(registration.active)
      return
    }

    reject(new Error('No service worker found'))
  })
}

/**
 * Wait for a specific Service Worker to activate
 */
function waitForServiceWorkerActivation(
  serviceWorker: ServiceWorker,
  resolve: (sw: ServiceWorker) => void,
  reject: (error: Error) => void
) {
  logger.debug('Waiting for Service Worker to activate...', serviceWorker.state)
  if (serviceWorker.state === 'activated') {
    resolve(serviceWorker)
    return
  }

  serviceWorker.addEventListener('statechange', () => {
    logger.debug('Service Worker state:', serviceWorker.state)
    if (serviceWorker.state === 'activated') {
      resolve(serviceWorker)
    }
  })

  serviceWorker.addEventListener('error', event => {
    reject(new Error(`Service Worker error: ${event}`))
  })
}

/**
 * Setup message listener for Service Worker messages
 */
function setupServiceWorkerMessageListener() {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type } = event.data || {}
    logger.debug('Received message from Service Worker:', type, event.data)

    if (type === 'service-worker-ready') {
      logger.debug('Service Worker is ready')
    }
  })
}

/**
 * Initialize the application
 */
async function init() {
  logger.debug('Initializing...')

  // Setup message listener before registering
  setupServiceWorkerMessageListener()

  // Register Service Worker and wait for it to be active
  const serviceWorker = await registerServiceWorker()

  if (serviceWorker) {
    logger.debug('Service Worker is active')
    // Send init message to Service Worker
    serviceWorker.postMessage({ type: 'init' })
  }

  // Mount Vue app
  logger.debug('Mounting Vue app...')
  createApp(App as Component).mount('#app')
}

await init()
