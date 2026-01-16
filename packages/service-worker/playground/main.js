import { createSvcWorkerController } from '@vrowser/service-worker/controller'
import {
  getAllControllers,
  suspendServiceWorker,
  resumeServiceWorker,
  terminateServiceWorker
} from '@vrowser/service-worker/admin'

// Application version - must match SW_VERSION in sw.js
const SW_VERSION = '2026-01-16-001'

// DOM Elements
const elements = {
  status: document.getElementById('status'),
  state: document.getElementById('state'),
  version: document.getElementById('version'),
  swInfo: document.getElementById('sw-info'),
  eventLog: document.getElementById('event-log'),
  apiResponse: document.getElementById('api-response'),
  // Sections
  statusSection: document.getElementById('status-section'),
  controllerSection: document.getElementById('controller-section'),
  adminSection: document.getElementById('admin-section'),
  // Buttons
  btnControllerSuspend: document.getElementById('btn-controller-suspend'),
  btnControllerResume: document.getElementById('btn-controller-resume'),
  btnAdminSuspend: document.getElementById('btn-admin-suspend'),
  btnAdminResume: document.getElementById('btn-admin-resume'),
  btnAdminTerminate: document.getElementById('btn-admin-terminate'),
  // Script URL displays
  controllerScriptUrl: document.getElementById('controller-script-url'),
  adminScriptUrl: document.getElementById('admin-script-url')
}

// Track terminated state
let isTerminated = false

// Update status section styling based on state
function updateStatusSectionStyle(state) {
  // Remove all state classes
  elements.statusSection.classList.remove(
    'status-activated',
    'status-suspended',
    'status-terminated'
  )
  elements.status.classList.remove(
    'status-text-activated',
    'status-text-suspended',
    'status-text-terminated'
  )

  // Add appropriate class based on state
  if (state === 'activated') {
    elements.statusSection.classList.add('status-activated')
    elements.status.classList.add('status-text-activated')
    elements.status.textContent = 'ACTIVATED'
  } else if (state === 'suspended') {
    elements.statusSection.classList.add('status-suspended')
    elements.status.classList.add('status-text-suspended')
    elements.status.textContent = 'SUSPENDED'
  } else if (state === 'terminated') {
    elements.statusSection.classList.add('status-terminated')
    elements.status.classList.add('status-text-terminated')
    elements.status.textContent = 'TERMINATED'
  }
}

// Set terminated state and update UI
function setTerminatedState() {
  isTerminated = true

  // Update status section
  updateStatusSectionStyle('terminated')
  elements.state.textContent = 'unregistered'
  elements.swInfo.textContent = 'Unregistered'

  // Disable SvcWorkerController controls
  elements.controllerSection.classList.add('disabled')
  elements.btnControllerSuspend.disabled = true
  elements.btnControllerResume.disabled = true

  // Disable Admin API controls (except terminate is already done)
  elements.btnAdminSuspend.disabled = true
  elements.btnAdminResume.disabled = true
  elements.btnAdminTerminate.disabled = true
}

// Event log helper
function logEvent(type, data = null) {
  const entry = document.createElement('div')
  entry.className = `event-entry event-${type}`
  const timestamp = new Date().toLocaleTimeString()
  entry.textContent = data
    ? `[${timestamp}] ${type}: ${JSON.stringify(data)}`
    : `[${timestamp}] ${type}`
  elements.eventLog.appendChild(entry)
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight
}

// Update UI state
function updateUI(controller) {
  elements.state.textContent = controller.state
  elements.version.textContent = controller.version
  elements.swInfo.textContent = controller.serviceWorker
    ? `Active (${controller.serviceWorker.state})`
    : 'Not available'
}

// Global controller reference for button handlers
let controller = null

// Initialize the application
async function init() {
  try {
    elements.status.textContent = 'Creating controller...'
    logEvent('init', { version: SW_VERSION })

    // Create Service Worker controller using the unplugin pattern
    // The `new URL('./sw.js', import.meta.url)` pattern is detected by the plugin
    controller = createSvcWorkerController({
      scriptURL: new URL('./sw.js', import.meta.url),
      version: SW_VERSION,
      debug: (...msg) => {
        console.log('[Controller Debug]', ...msg)
        logEvent('debug', ...msg)
      }
    })

    console.log('Controller created:', controller.scriptURL)
    logEvent('controllerCreated', { scriptURL: controller.scriptURL })

    // Update script URL displays
    elements.controllerScriptUrl.textContent = controller.scriptURL
    elements.adminScriptUrl.textContent = controller.scriptURL

    // Subscribe to all events

    // State change events
    controller.on('changeState', info => {
      console.log('State changed:', info.state)
      logEvent('changeState', info)
      updateUI(controller)
    })

    // Reload suggested event
    controller.on('reloadSuggested', info => {
      console.log('Reload suggested:', info.reason)
      logEvent('reloadSuggested', info)
      elements.status.textContent = `Reload suggested: ${info.reason}`
    })

    // Suspended event (circuit breaker engaged)
    controller.on('suspended', () => {
      console.log('Service Worker suspended')
      logEvent('suspended')
      updateStatusSectionStyle('suspended')
      updateUI(controller)
    })

    // Resumed event (circuit breaker disengaged)
    controller.on('resumed', () => {
      console.log('Service Worker resumed')
      logEvent('resumed')
      updateStatusSectionStyle('activated')
      updateUI(controller)
    })

    // Terminated event (hard kill)
    controller.on('terminated', reason => {
      console.log('Service Worker terminated:', reason)
      logEvent('terminated', { reason })
      setTerminatedState()
    })

    // Progress events (for debugging/telemetry)
    controller.on('progress', phase => {
      console.log('Progress:', phase)
      logEvent('progress', phase)
    })

    // Wait for the controller to be ready
    elements.status.textContent = 'Waiting for ready()...'
    const isReady = await controller.ready({
      timeout: 30000
    })

    if (isReady) {
      logEvent('ready', { state: controller.state })
      updateStatusSectionStyle('activated')
      updateUI(controller)
    } else {
      elements.status.textContent = 'TIMEOUT'
      logEvent('timeout')
    }
  } catch (error) {
    console.error('Initialization error:', error)
    elements.status.textContent = `ERROR: ${error.message}`
    logEvent('error', { message: error.message })
  }
}

// SvcWorkerController button handlers
window.controllerSuspend = async function () {
  if (!controller || isTerminated) return
  try {
    logEvent('controller.suspend')
    const result = await controller.suspend()
    logEvent('controller.suspend result', result)
  } catch (error) {
    logEvent('controller.suspend error', { message: error.message })
  }
}

window.controllerResume = async function () {
  if (!controller || isTerminated) return
  try {
    logEvent('controller.resume')
    const result = await controller.resume()
    logEvent('controller.resume result', result)
  } catch (error) {
    logEvent('controller.resume error', { message: error.message })
  }
}

// Admin API button handlers
// Note: controller.scriptURL is a string, but Admin API functions expect URL objects
window.adminSuspend = async function () {
  if (!controller || isTerminated) return
  try {
    const scriptURL = new URL(controller.scriptURL)
    console.log('[adminSuspend] controller.scriptURL:', controller.scriptURL)
    console.log('[adminSuspend] scriptURL.href:', scriptURL.href)
    console.log('[adminSuspend] version:', controller.version)
    console.log('[adminSuspend] getAllControllers:', getAllControllers())
    logEvent('suspendServiceWorker', {
      scriptURL: scriptURL.href,
      version: controller.version
    })
    await suspendServiceWorker(scriptURL, controller.version)
    logEvent('suspendServiceWorker success')
  } catch (error) {
    console.error('[adminSuspend] error:', error)
    logEvent('suspendServiceWorker error', { message: error.message })
  }
}

window.adminResume = async function () {
  if (!controller || isTerminated) return
  try {
    const scriptURL = new URL(controller.scriptURL)
    logEvent('resumeServiceWorker', {
      scriptURL: scriptURL.href,
      version: controller.version
    })
    await resumeServiceWorker(scriptURL, controller.version)
    logEvent('resumeServiceWorker success')
  } catch (error) {
    logEvent('resumeServiceWorker error', { message: error.message })
  }
}

window.adminTerminate = async function () {
  if (!controller || isTerminated) return
  try {
    const scriptURL = new URL(controller.scriptURL)
    logEvent('terminateServiceWorker', {
      scriptURL: scriptURL.href,
      version: controller.version
    })
    await terminateServiceWorker(scriptURL, controller.version)
    logEvent('terminateServiceWorker success')
    setTerminatedState()
  } catch (error) {
    logEvent('terminateServiceWorker error', { message: error.message })
  }
}

window.testFetch = async function () {
  try {
    logEvent('fetchRequested', { endpoint: '/api/status' })
    const response = await fetch('/api/status')
    const data = await response.json()
    elements.apiResponse.textContent = JSON.stringify(data, null, 2)
    logEvent('fetchSuccess', data)
  } catch (error) {
    elements.apiResponse.textContent = `Error: ${error.message}`
    logEvent('fetchError', { message: error.message })
  }
}

window.testEcho = async function () {
  try {
    logEvent('echoRequested', { endpoint: '/api/echo' })
    const response = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'X-Test-Header': 'test-value' }
    })
    const data = await response.json()
    elements.apiResponse.textContent = JSON.stringify(data, null, 2)
    logEvent('echoSuccess', data)
  } catch (error) {
    elements.apiResponse.textContent = `Error: ${error.message}`
    logEvent('echoError', { message: error.message })
  }
}

// Export for testing
window.testApp = {
  controller: null,
  getController: () => controller,
  getAllControllers,
  suspendServiceWorker,
  resumeServiceWorker,
  terminateServiceWorker
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  // oxlint-disable-next-line @typescript-eslint/no-floating-promises
  init()
}
