/**
 * HMR Runtime (iframe)
 *
 * This module runs in the preview iframe and handles code evaluation.
 * It receives bundled code from the Worker via MessagePort and evaluates it.
 *
 * Message Flow:
 * - Main → iframe: { type: 'connect', port: MessagePort }
 * - Worker → iframe: { type: 'eval', code, path } (via MessagePort)
 * - iframe → Main: { type: 'ready' }
 * - iframe → Main: { type: 'success' }
 * - iframe → Main: { type: 'error', message }
 */

/**
 * HMR Hot Context
 */
interface HotContext {
  data: Record<string, unknown>
  accept(cb?: (mod?: unknown) => void): void
  dispose(cb: (data: Record<string, unknown>) => void): void
}

// HMR state
const hotData = new Map<string, Record<string, unknown>>()
const acceptCallbacks = new Map<string, ((mod?: unknown) => void) | undefined>()
const disposeCallbacks = new Map<string, (data: Record<string, unknown>) => void>()

/**
 * Create HMR context for a module
 */
function createHot(id: string): HotContext {
  // Initialize data for this module if not exists
  if (!hotData.has(id)) {
    hotData.set(id, {})
  }

  return {
    get data() {
      return hotData.get(id)!
    },
    accept(cb) {
      acceptCallbacks.set(id, cb)
    },
    dispose(cb) {
      disposeCallbacks.set(id, cb)
    }
  }
}

// Expose HMR runtime globally
declare global {
  interface Window {
    __HMR_RUNTIME__: {
      createHot: typeof createHot
    }
  }
}

window.__HMR_RUNTIME__ = {
  createHot
}

/**
 * Evaluate bundled code
 */
async function evalCode(code: string): Promise<void> {
  // Create a blob URL for the bundled code
  const blob = new Blob([code], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)

  try {
    // Dynamically import the module
    await import(/* @vite-ignore */ url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Perform HMR update
 */
async function hmrUpdate(changedPath: string, bundledCode: string): Promise<void> {
  // Check if any module accepts HMR
  const acceptCb = acceptCallbacks.get(changedPath)

  if (acceptCb !== undefined) {
    // Module accepts HMR - call dispose first
    const disposeCb = disposeCallbacks.get(changedPath)
    if (disposeCb) {
      const data = hotData.get(changedPath) || {}
      disposeCb(data)
      hotData.set(changedPath, data)
    }

    // Evaluate the new code
    await evalCode(bundledCode)

    // Call accept callback
    acceptCb()

    console.log(`[HMR] Module ${changedPath} updated`)
  } else {
    // No HMR boundary found - full reload
    console.log('[HMR] No accept handler found, eval code...')
    await evalCode(bundledCode)
  }
}

/**
 * Notify parent window
 */
function notify(message: { type: string; message?: string }): void {
  window.parent.postMessage(message, '*')
}

// MessagePort for receiving bundled code from Worker
let workerPort: MessagePort | null = null

/**
 * Handle execute messages from Worker (via MessagePort)
 */
async function handleEvalMessage(
  event: MessageEvent<{ type: string; code?: string; path?: string }>
): Promise<void> {
  const { type, code, path } = event.data || {}

  if (type === 'execute' && code && path) {
    console.log(`[Runtime] Received execute for ${path}`)

    try {
      // Perform HMR or execute
      await hmrUpdate(path, code)
      notify({ type: 'success' })
    } catch (err) {
      console.error('[HMR] Execution error:', err)
      notify({ type: 'error', message: String(err) })
    }
  }
}

/**
 * Handle messages from parent (Main window)
 */
function handleMessage(event: MessageEvent<{ type: string; port?: MessagePort }>): void {
  const { type, port } = event.data || {}

  if (type === 'connect' && port) {
    console.log('[HMR] Received connect with MessagePort')
    workerPort = port
    workerPort.onmessage = handleEvalMessage
    notify({ type: 'ready' })
  }
}

// Initialize
console.log('[HMR] connecting...')

// Listen for messages from parent
window.addEventListener('message', handleMessage)

console.log('[HMR] Ready, waiting for init...')

console.log('[HMR] import.meta', import.meta)
