import { EventEmitter } from 'node:events'

import type { WorkerMessage } from './types.ts'

export class WindowMessageDevServer extends EventEmitter {
  #target: (Window & typeof globalThis) | null = null

  constructor(target: Window & typeof globalThis) {
    super()
    this.#target = target
    console.log('[DevWindowMessageServer] Initialized')
  }

  listen(): void {
    this.#target?.addEventListener('message', this.#handleMessage.bind(this))
    console.log('[DevWindowMessageServer] litesn for messages')
  }

  close(): void {
    this.#target?.removeEventListener('message', this.#handleMessage.bind(this))
    this.#target = null
    console.log('[DevWindowMessageServer] close server')
  }

  #handleMessage(event: MessageEvent<WorkerMessage>): void {
    const message = event.data
    console.log('[DevWindowMessageServer] Received message:', message)
    switch (message.type) {
      case 'connect':
        break
      case 'disconnect':
        break
      case 'bundle':
        this.emit('bundle', message)
        break
      default:
        // @ts-expect-error -- ignore
        console.warn(`[DevWindowMessageServer] Unknown message type: ${message.type}`)
    }
  }
}

export function createWindowMessageDevServer(
  target: Window & typeof globalThis
): WindowMessageDevServer {
  return new WindowMessageDevServer(target)
}
