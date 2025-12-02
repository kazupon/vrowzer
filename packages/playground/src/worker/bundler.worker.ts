/**
 * Bundler Worker
 *
 * This worker handles code bundling using `@rolldown/browser`.
 * It runs in a separate thread to avoid blocking the main UI.
 *
 * Message Flow:
 * - Main → Worker: { type: 'init', port: MessagePort }
 * - Main → Worker: { type: 'bundle', entry, files }
 * - Worker → iframe: { type: 'execute', code, path } (via MessagePort)
 * - Worker → Main: { type: 'ready' }
 * - Worker → Main: { type: 'bundle-error', message }
 */

import type { rolldown as Rolldown, RolldownPlugin } from '@rolldown/browser'

// Types for rolldown binding with __volume
interface RolldownBinding {
  readonly __volume: {
    reset(): void
    fromJSON(fileMap: { [path: string]: string }): void
  }
}

// Message types from Main
interface InitMessage {
  type: 'init'
  port: MessagePort
}

interface BundleMessage {
  type: 'bundle'
  entry: string
  files: Record<string, string>
}

type WorkerMessage = InitMessage | BundleMessage

// Response types to Main
interface ReadyResponse {
  type: 'ready'
}

interface BundleErrorResponse {
  type: 'bundle-error'
  message: string
}

type WorkerResponse = ReadyResponse | BundleErrorResponse

// Execute message to iframe (via MessagePort)
interface ExecuteMessage {
  type: 'execute'
  code: string
  path: string
}

/**
 * Dynamic import helper to avoid Vite's static analysis
 */
function dynamicImport<T = unknown>(url: string): Promise<T> {
  return new Function('url', 'return import(url)')(url) as Promise<T>
}

// Lazy-loaded modules
let _rolldown: typeof Rolldown | null = null
let _binding: RolldownBinding | null = null

// MessagePort for direct communication with iframe
let iframePort: MessagePort | null = null

/**
 * Load rolldown from proxy
 */
async function loadRolldown(): Promise<[typeof Rolldown, RolldownBinding]> {
  if (_rolldown && _binding) {
    console.log('[Worker] Rolldown already initialized')
    return [_rolldown, _binding]
  }

  console.log('[Worker] Initializing rolldown...')

  // Load rolldown and binding from proxy
  const [rolldownModule, bindingModule] = await Promise.all([
    dynamicImport<{ rolldown: typeof Rolldown }>('/api/rolldown/dist/index.browser.mjs'),
    dynamicImport<RolldownBinding>('/api/rolldown/dist/rolldown-binding.wasi-browser.js')
  ])

  _rolldown = rolldownModule.rolldown
  _binding = bindingModule

  console.log('[Worker] Rolldown initialized')

  return [_rolldown, _binding]
}

/**
 * Prepare file map for __volume
 */
function prepareFileMap(binding: RolldownBinding, files: Record<string, string>): void {
  const fileMap: { [path: string]: string } = Object.create(null) as { [path: string]: string }
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash for __volume
    const volumePath = path.startsWith('/') ? path.slice(1) : path
    fileMap[volumePath] = content
  }

  console.log('[Worker] Files in volume:', Object.keys(fileMap))

  // Reset and populate the virtual file system
  binding.__volume.reset()
  binding.__volume.fromJSON(fileMap)
}

/**
 * HMR injection plugin
 * Injects `import.meta.hot` implementation
 */
function hmrPlugin(): RolldownPlugin {
  return {
    name: 'hmr',
    transform(code: string, id: string) {
      // Inject HMR context for each module
      const hmrPreamble = `
const __hmr_id__ = ${JSON.stringify(id)};
const __hmr_hot__ = window.__HMR_RUNTIME__?.createHot(__hmr_id__) ?? { accept: () => {}, dispose: () => {}, data: {} };
const import_meta_hot = __hmr_hot__;
`
      // Replace `import.meta.hot` with our implementation
      const transformed = code.replace(/import\.meta\.hot/g, 'import_meta_hot')

      return {
        code: hmrPreamble + transformed,
        map: null
      }
    }
  }
}

/**
 * Bundle the code using rolldown
 */
async function bundle(entry: string, files: Record<string, string>): Promise<string> {
  const [rolldown, binding] = await loadRolldown()

  // Prepare file system
  prepareFileMap(binding, files)

  const bundleStart = performance.now()

  // Bundle
  const build = await rolldown({
    input: entry.startsWith('/') ? entry.slice(1) : entry,
    cwd: '/',
    plugins: [hmrPlugin()],
    onLog(level, log) {
      if (level === 'warn') {
        console.warn('[Worker]', log.message)
      }
    }
  })

  const bundleEnd = performance.now()
  console.log(`[Worker] Bundling completed in ${(bundleEnd - bundleStart).toFixed(2)} ms`)

  try {
    const generateStart = performance.now()
    const result = await build.generate({ format: 'esm' })
    const generateEnd = performance.now()
    console.log(
      `[Worker] Code generation completed in ${(generateEnd - generateStart).toFixed(2)} ms`
    )

    // Find the main chunk
    for (const chunk of result.output) {
      if (chunk.type === 'chunk' && chunk.code) {
        return chunk.code
      }
    }

    throw new Error('No output chunk generated')
  } finally {
    await build.close()
  }
}

/**
 * Send response to main thread
 */
function respond(response: WorkerResponse): void {
  self.postMessage(response)
}

/**
 * Send execute message to iframe via MessagePort
 */
function sendToIframe(message: ExecuteMessage): void {
  if (!iframePort) {
    console.error('[Worker] No iframe port available')
    respond({ type: 'bundle-error', message: 'No iframe port available' })
    return
  }
  iframePort.postMessage(message)
}

/**
 * Handle messages from main thread
 */
async function handleMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
  const message = event.data

  switch (message.type) {
    case 'init':
      console.log('[Worker] Received init with MessagePort')
      if (message.port) {
        iframePort = message.port
        // Pre-load rolldown
        try {
          await loadRolldown()
          respond({ type: 'ready' })
        } catch (err) {
          respond({ type: 'bundle-error', message: `Init failed: ${err}` })
        }
      } else {
        respond({ type: 'bundle-error', message: 'No port provided in init message' })
      }
      break

    case 'bundle':
      console.log(`[Worker] Bundling ${message.entry}...`)
      try {
        const code = await bundle(message.entry, message.files)
        // Send bundled code directly to iframe via MessagePort
        sendToIframe({
          type: 'execute',
          code,
          path: message.entry
        })
      } catch (err) {
        console.error('[Worker] Bundle error:', err)
        respond({ type: 'bundle-error', message: String(err) })
      }
      break

    default:
      console.warn('[Worker] Unknown message type:', (message as { type: string }).type)
  }
}

// Set up message handler
self.onmessage = handleMessage

console.log('[Worker] Bundler worker started')
