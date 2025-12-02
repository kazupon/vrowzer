/**
 * Worker for bundling
 *
 * This worker handles code bundling using `@rolldown/browser`.
 * It runs in a separate thread to avoid blocking the main UI.
 *
 * Message Flow:
 * - Main → Worker: { type: 'connect', port: MessagePort }
 * - Main → Worker: { type: 'bundle', entry, files }
 * - Worker → iframe: { type: 'eval', code, path } (via MessagePort)
 * - Worker → Main: { type: 'ready' }
 * - Worker → Main: { type: 'bundle-error', message }
 */

import { bundle, loadRolldown } from '../bundler.ts'

// Message types from Main
interface InitMessage {
  type: 'connect'
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

// Eval message to iframe (via MessagePort)
interface EvalMessage {
  type: 'eval'
  code: string
  path: string
}

// MessagePort for direct communication with iframe
let iframePort: MessagePort | null = null

/**
 * Send response to main thread
 */
function respond(response: WorkerResponse): void {
  self.postMessage(response)
}

/**
 * Send eval message to iframe via MessagePort
 */
function sendToIframe(message: EvalMessage): void {
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
    case 'connect':
      console.log('[Worker] Received connect with MessagePort')
      if (message.port) {
        iframePort = message.port
        // Pre-load rolldown
        try {
          await loadRolldown()
          respond({ type: 'ready' })
        } catch (err) {
          respond({ type: 'bundle-error', message: `Connect failed: ${err}` })
        }
      } else {
        respond({ type: 'bundle-error', message: 'No port provided in connect message' })
      }
      break

    case 'bundle':
      console.log(`[Worker] Bundling ${message.entry}...`)
      try {
        const code = await bundle(message.entry, message.files)
        // Send bundled code directly to iframe via MessagePort
        sendToIframe({
          type: 'eval',
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
