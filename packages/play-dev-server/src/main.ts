import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { initServiceWorker } from './sw/controller.ts'

import type { Component } from 'vue'

/**
 * Initialize the application
 */
async function init() {
  console.log('[Main] Initializing...')

  try {
    // Initialize Service Worker and wait for it to be ready
    const controller = await initServiceWorker()
    console.log('[Main] SW ready:', controller.state)
  } catch (error) {
    console.error('[Main] SW init failed:', error)
  }

  // Mount Vue app
  console.log('[Main] Mounting Vue app...')
  createApp(App as Component).mount('#app')
}

await init()
