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

  // Initialize Service Worker
  await initServiceWorker()

  // Mount Vue app
  console.log('[Main] Mounting Vue app...')
  createApp(App as Component).mount('#app')
}

await init()
