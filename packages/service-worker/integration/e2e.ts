import { createSvcWorkerController } from '@vrowzer/service-worker/controller'

const statusEl = document.getElementById('status')
const stateEl = document.getElementById('controller-state')
const versionEl = document.getElementById('version')

// Get version from URL query parameter
const params = new URLSearchParams(window.location.search)
const swVersion = params.get('version') || 'v1'
// Use e2e-sw.js from test-public (served as static file)
const swPath = params.get('sw') || `/e2e-sw.js?version=${swVersion}`
const scope = params.get('scope') || '/'
const swType = params.get('type') || 'module'

window.dynamicImport = function <T = unknown>(url: string): Promise<T> {
  // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-call -- NOTE: For vitest, avoid SSR dynamic import analysis
  return new Function('url', 'return import(url)')(url) as Promise<T>
}

// Expose controller globally for testing
window.testState = {
  controller: null,
  states: [],
  events: [],
  controllerChanges: [] as Array<{ time: number; controller: string | null }>
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
    statusEl!.textContent = 'Creating controller...'

    const controller = createSvcWorkerController({
      scriptURL: new URL(swPath, window.location.origin),
      version: swVersion,
      scope,
      type: swType as 'module' | 'classic'
    })

    window.testState.controller = controller

    // Listen for state changes
    controller.on('changeState', info => {
      window.testState.states.push(info.state)
      stateEl!.textContent = `State: ${info.state}`
    })

    // Listen for other events
    controller.on('reloadSuggested', info => {
      window.testState.events.push({ type: 'reloadSuggested', data: info })
    })

    controller.on('suspended', () => {
      window.testState.events.push({ type: 'suspended' })
    })

    controller.on('resumed', () => {
      window.testState.events.push({ type: 'resumed' })
    })

    controller.on('terminated', reason => {
      window.testState.events.push({ type: 'terminated', data: reason })
    })

    statusEl!.textContent = 'Calling ready()...'

    const result = await controller.ready({ timeout: 15000 })

    if (result) {
      statusEl!.textContent = 'activated'
      versionEl!.textContent = `Version: ${controller.version}`
      stateEl!.textContent = `State: ${controller.state}`
    } else {
      statusEl!.textContent = 'ready-timeout'
    }
  } catch (error) {
    statusEl!.textContent = `error: ${(error as Error).message}`
    console.error('Controller error:', error)
  }
}

// oxlint-disable-next-line typescript/no-floating-promises -- for testing
init()
