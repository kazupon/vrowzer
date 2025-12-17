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
import { createServer } from '../severEntry.ts'

import type { ViteDevServer } from 'vite'
import type { Rolldown, RolldownBinding } from '../bundler.ts'

// Message types from Main
interface ConnectMessage {
  type: 'connect'
  port: MessagePort
}

interface BundleMessage {
  type: 'bundle'
  entry: string
  files: Record<string, string>
}

interface DisconnectMessage {
  type: 'disconnect'
}

type WorkerMessage = ConnectMessage | BundleMessage | DisconnectMessage

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

/**
 * Send response to main thread
 */
function respond(response: WorkerResponse): void {
  self.postMessage(response)
}

// MessagePort for direct communication with iframe
let iframePort: MessagePort | null = null

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

let rolldown: Rolldown | null = null
let binding: RolldownBinding | null = null
let server: ViteDevServer | null = null

async function connect(rolldown: Rolldown, binding: RolldownBinding): Promise<void> {
  server = await createServer({}, rolldown, binding)
}

async function disconnect(): Promise<void> {
  await server?.close()
  server = null
  iframePort?.close()
  iframePort = null
}

/**
 * Handle messages from main thread
 */
async function handleMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
  const message = event.data

  switch (message.type) {
    case 'connect': {
      console.log('[Worker] Received connect with MessagePort')
      if (message.port) {
        iframePort = message.port
        // Pre-load rolldown
        try {
          ;[rolldown, binding] = await loadRolldown()
          await connect(rolldown, binding)
          respond({ type: 'ready' })
        } catch (err) {
          respond({ type: 'bundle-error', message: `Connect failed: ${err}` })
        }
      } else {
        respond({ type: 'bundle-error', message: 'No port provided in connect message' })
      }
      break
    }
    case 'disconnect': {
      console.log('[Worker] Received disconnect')
      try {
        await disconnect()
      } catch (err) {
        respond({ type: 'bundle-error', message: `Disconnect failed: ${err}` })
      } finally {
        rolldown = null
        binding = null
      }
      break
    }
    case 'bundle': {
      console.log(`[Worker] Bundling ${message.entry}...`)
      if (!rolldown || !binding) {
        respond({ type: 'bundle-error', message: 'Bundler not initialized' })
        break
      }
      try {
        const code = await bundle(rolldown!, binding!, message.entry, message.files)
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
    }
    default: {
      console.warn('[Worker] Unknown message type:', (message as { type: string }).type)
    }
  }
}

// Set up message handler
self.onmessage = handleMessage

console.log('[Worker] Bundler worker started')
