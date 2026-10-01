/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Vrowzer } from 'vrowzer'

import type { VrowzerOptions } from 'vrowzer'

// Track Vrowzer's Web Workers, so that a test can terminate them.
// Worker is replaced before any Vrowzer instance creates one.
const webWorkers = new Set<Worker>()

class TrackedWorker extends Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    super(scriptURL, options)
    webWorkers.add(this)
  }
}

window.Worker = TrackedWorker

// Record the type of each message sent to the Service Worker, in order
const serviceWorkerMessages: string[] = []
const postMessage = ServiceWorker.prototype.postMessage as (...args: unknown[]) => void
ServiceWorker.prototype.postMessage = function (this: ServiceWorker, ...args: unknown[]) {
  const type = (args[0] as { type?: unknown } | null)?.type
  serviceWorkerMessages.push(String(type))
  postMessage.apply(this, args)
} as typeof ServiceWorker.prototype.postMessage

interface RecordedEvent {
  type: string
  id?: string
  stage?: string
  status?: number
  message?: string
}

const events: RecordedEvent[] = []

function createVrowzer(options?: VrowzerOptions) {
  const vrowzer = Vrowzer(options)
  vrowzer.on('serviceWorkerRecovered', () => {
    events.push({ type: 'serviceWorkerRecovered' })
  })
  vrowzer.on('serviceWorkerRecoveryError', error => {
    events.push({ type: 'serviceWorkerRecoveryError', message: error.message })
  })
  vrowzer.on('previewLoadError', info => {
    events.push({
      type: 'previewLoadError',
      id: info.id,
      stage: info.stage,
      status: info.status,
      message: info.message
    })
  })
  return vrowzer
}

function mainSource(text: string): string {
  return `document.querySelector('#app').innerHTML = '<h1>${text}</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
}

// No /index.html: the runtime adds its default, which a restarted Service Worker needs as well
const previewFiles = {
  '/main.js': mainSource('main v1'),
  '/remove-me.js': 'export const removed = false',
  '/held.js': 'export const held = true',
  '/public/hello.txt': 'hello v1',
  '/public/pixel.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff])
    .buffer
}

Object.assign(window, {
  __createVrowzer__: createVrowzer,
  __mainSource__: mainSource,
  __previewFiles__: previewFiles,
  __events__: events,
  __serviceWorkerMessages__: serviceWorkerMessages,
  __terminateWebWorkers__: () => {
    for (const worker of webWorkers) {
      worker.terminate()
    }
    webWorkers.clear()
  },
  // Stays as long as the host page is not reloaded
  __hostMarker__: crypto.randomUUID()
})

document.body.dataset.fixtureReady = 'true'
