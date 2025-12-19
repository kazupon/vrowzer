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

import { bundle, loadRolldown, prepareFileMap } from '../bundler.ts'
import { _register as _registerFS, _unregister as _unregisterFS } from '../polyfills/fs.ts'
import { _register as _registerFSP, _unregister as _unregisterFSP } from '../polyfills/fsp.ts'
import { createServer } from '../severEntry.ts'

import type { ViteDevServer } from 'vite'
import type { Rolldown, RolldownBinding } from '../bundler.ts'
import type { EvalMessage, WorkerMessage, WorkerResponse } from '../messages/types.ts'

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

async function connect(
  rolldown: Rolldown,
  binding: RolldownBinding,
  hmrPort: MessagePort
): Promise<void> {
  server = await createServer({}, rolldown, binding, hmrPort)
  // const watcher: FSWatcher = new binding.__fs.FSWatcher()
  // console.log('[Worker] Starting FSWatcher...', watcher)
  // watcher.start('/')
  // watcher.on('change', (path: string) => {
  //   console.log(`[FSWatcher] File changed --->: ${path}`)
  // })
  // // watcher.on('change', path => {
  // //   console.log(`[FSWatcher] File changed: ${path}`)
  // // })
  // setInterval(() => {
  //   // console.log('[worker] Writing test file to virtual FS')
  //   binding.__fs.appendFileSync('/main.ts', 'test')
  //   console.log('[worker] File written.', binding.__volume.toJSON())
  // }, 1000)
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
          _registerFS(binding)
          _registerFSP(binding)
          await connect(rolldown, binding, iframePort)
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
        _unregisterFS()
        _unregisterFSP()
      } catch (err) {
        respond({ type: 'bundle-error', message: `Disconnect failed: ${err}` })
      } finally {
        rolldown = null
        binding = null
      }
      break
    }
    case 'bundle': {
      console.log(`[Worker] Bundling ${message.entry}...`, message.files)
      if (!rolldown || !binding) {
        respond({ type: 'bundle-error', message: 'Bundler not initialized' })
        break
      }
      try {
        prepareFileMap(binding, message.files)
        const code = await bundle(rolldown!, message.entry)
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
