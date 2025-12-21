import { createApp } from 'vue'
import App from './App.vue'
import { debug } from './logger.ts'
import './style.css'

import type { Component } from 'vue'

/**
 * Register Service Worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
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
    return registration
  } catch (error) {
    debug('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Wait for Service Worker to be active
 */
async function waitForServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  const registration = await navigator.serviceWorker.ready
  return registration.active
}

/**
 * Setup message listener for Service Worker messages
 */
function setupServiceWorkerMessageListener() {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type } = event.data || {}
    debug('Received message from SW:', type, event.data)

    if (type === 'sw-ready') {
      debug('Service Worker is ready')
    }
  })
}

/**
 * Initialize the application
 */
async function init() {
  debug('Initializing...')

  // Register Service Worker
  await registerServiceWorker()

  // Setup message listener
  setupServiceWorkerMessageListener()

  // Wait for Service Worker to be ready
  const serviceWorker = await waitForServiceWorker()

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
