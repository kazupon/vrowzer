import { createApp } from 'vue'
import App from './App.vue'
import { debug } from './logger.ts'
import './style.css'

import type { Component } from 'vue'

/**
 * Register Service Worker and wait for it to be active
 */
async function registerServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    debug('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/src/sw/sw.ts', {
      type: 'module',
      scope: '/src/sw/'
    })
    debug('Service Worker registered:', registration.scope)

    // Wait for the service worker to be active
    const serviceWorker = await waitForServiceWorkerActive(registration)
    return serviceWorker
  } catch (error) {
    debug('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Wait for Service Worker to be active using registration object
 */
function waitForServiceWorkerActive(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorker> {
  return new Promise((resolve, reject) => {
    // Check if already active
    if (registration.active) {
      debug('Service Worker already active')
      resolve(registration.active)
      return
    }

    // Get the installing or waiting service worker
    const serviceWorker = registration.installing || registration.waiting

    if (!serviceWorker) {
      reject(new Error('No service worker found'))
      return
    }

    debug('Waiting for Service Worker to activate...', serviceWorker.state)

    // Listen for state changes
    serviceWorker.addEventListener('statechange', () => {
      debug('Service Worker state:', serviceWorker.state)
      if (serviceWorker.state === 'activated') {
        resolve(serviceWorker)
      }
    })

    // Handle errors
    serviceWorker.addEventListener('error', event => {
      reject(new Error(`Service Worker error: ${event}`))
    })
  })
}

/**
 * Setup message listener for Service Worker messages
 */
function setupServiceWorkerMessageListener() {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type } = event.data || {}
    debug('Received message from SW:', type, event.data)

    if (type === 'service-worker-ready') {
      debug('Service Worker is ready')
    }
  })
}

/**
 * Initialize the application
 */
async function init() {
  debug('Initializing...')

  // Setup message listener before registering
  setupServiceWorkerMessageListener()

  // Register Service Worker and wait for it to be active
  const serviceWorker = await registerServiceWorker()

  if (serviceWorker) {
    debug('Service Worker is active')
    // Send init message to Service Worker
    serviceWorker.postMessage({ type: 'init' })
  }

  // Mount Vue app
  console.log('Mounting Vue app...')
  createApp(App as Component).mount('#app')
}

await init()
