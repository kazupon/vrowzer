import { createApp } from 'vue'
import App from './App.vue'
import { createLogger } from './logger.ts'
import './style.css'
import { initServiceWorker } from './sw/controller.ts'
import html from './template.html?raw'

import type { Component } from 'vue'

const logger = createLogger('main')

/**
 * Initialize the application
 */
async function init() {
  logger.debug('Initializing...')

  // Initialize Service Worker
  await initServiceWorker()

  // Mount Vue app
  logger.debug('Mounting Vue app...')
  createApp(App as Component).mount('#app')
}

console.log('load html', html)

await init()
