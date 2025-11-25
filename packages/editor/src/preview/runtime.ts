import { bundle, updateFile } from './bundler'

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
    },
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
  createHot,
}

/**
 * Execute bundled code
 */
async function executeCode(code: string): Promise<void> {
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

    // Execute the new code
    await executeCode(bundledCode)

    // Call accept callback
    acceptCb()

    console.log(`[HMR] Module ${changedPath} updated`)
  } else {
    // No HMR boundary found - full reload
    console.log('[HMR] No accept handler found, executing code...')
    await executeCode(bundledCode)
  }
}

/**
 * Initial bundle and execute
 */
async function initialRun(): Promise<void> {
  try {
    const code = await bundle('/main.js')
    await executeCode(code)
    notify({ type: 'success' })
  } catch (err) {
    console.error('[Bundler] Initial run error:', err)
    notify({ type: 'error', message: String(err) })
  }
}

/**
 * Notify parent window
 */
function notify(message: { type: string; message?: string }): void {
  window.parent.postMessage(message, '*')
}

/**
 * Handle messages from parent
 */
async function handleMessage(event: MessageEvent): Promise<void> {
  const { type, path, code } = event.data || {}

  if (type === 'update' && path && code) {
    console.log(`[Bundler] Received update for ${path}`)

    try {
      // Update the file in virtual FS
      updateFile(path, code)

      // Re-bundle
      const bundledCode = await bundle('/main.js')

      // Perform HMR or execute
      await hmrUpdate(path, bundledCode)

      notify({ type: 'success' })
    } catch (err) {
      console.error('[Bundler] Update error:', err)
      notify({ type: 'error', message: String(err) })
    }
  }
}

// Initialize
console.log('[HMR Runtime] Initializing...')

// Listen for messages from parent
window.addEventListener('message', handleMessage)

// Notify parent that we're ready
notify({ type: 'ready' })

console.log('[HMR Runtime] Ready, waiting for code...')
