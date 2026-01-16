import { createSvcWorkerController } from '@vrowser/service-worker/controller'

const SW_VERSION = 'e2e-test-v1'

const statusEl = document.getElementById('status')
const stateEl = document.getElementById('state')
const versionEl = document.getElementById('version')
const swUrlEl = document.getElementById('sw-url')

// Expose test state for Playwright
window.testState = {
  controller: null,
  states: [],
  events: [],
  controllerChanges: []
}

// Track controllerchange events
navigator.serviceWorker.addEventListener('controllerchange', () => {
  const controller = navigator.serviceWorker.controller
  window.testState.controllerChanges.push({
    time: Date.now(),
    controller: controller?.scriptURL ?? null
  })
})

async function init() {
  try {
    statusEl.textContent = 'Creating controller...'

    // Create Service Worker controller using the unplugin pattern
    // The `new URL('./sw.js', import.meta.url)` pattern is detected by the plugin
    const controller = createSvcWorkerController({
      scriptURL: new URL('./sw.js', import.meta.url),
      version: SW_VERSION,
      type: 'module'
    })

    window.testState.controller = controller
    swUrlEl.textContent = `SW URL: ${controller.scriptURL}`

    // Subscribe to state changes
    controller.on('changeState', info => {
      window.testState.states.push(info.state)
      stateEl.textContent = `State: ${info.state}`
    })

    // Subscribe to events
    controller.on('suspended', () => {
      window.testState.events.push({ type: 'suspended' })
    })

    controller.on('resumed', () => {
      window.testState.events.push({ type: 'resumed' })
    })

    controller.on('terminated', reason => {
      window.testState.events.push({ type: 'terminated', data: reason })
    })

    statusEl.textContent = 'Waiting for ready()...'

    const isReady = await controller.ready({ timeout: 15000 })

    if (isReady) {
      statusEl.textContent = 'activated'
      versionEl.textContent = `Version: ${controller.version}`
      stateEl.textContent = `State: ${controller.state}`
    } else {
      statusEl.textContent = 'timeout'
    }
  } catch (error) {
    statusEl.textContent = `error: ${error.message}`
    console.error('Controller error:', error)
  }
}

// oxlint-disable-next-line @typescript-eslint/no-floating-promises
init()
