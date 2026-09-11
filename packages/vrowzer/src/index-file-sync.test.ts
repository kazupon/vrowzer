import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import {
  V_WW_READY,
  V_WW_SETUP,
  V_WW_SETUP_ACK,
  V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK,
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK
} from '@vrowzer/vite-dev-server/messages'

const controllerMocks = vi.hoisted(() => ({
  container: new EventTarget(),
  on: vi.fn<(...args: unknown[]) => void>(),
  postMessage: vi.fn<(message: { type: string }) => void>()
}))

vi.mock('./controller.ts', () => ({
  getController: () => controllerMocks,
  getServiceWorker: () => ({ postMessage: controllerMocks.postMessage }),
  initServiceWorker: async () => undefined
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))

import { Vrowzer } from './index.ts'

let workers: TestWorker[]

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: unknown[] = []

  constructor() {
    workers.push(this)
    this.reply(V_WW_READY)
  }

  postMessage(message: { type: string }): void {
    this.messages.push(message)
    if (message.type === V_WW_SETUP) {
      this.reply(V_WW_SETUP_ACK)
    } else if (message.type === V_SW_CONNECT_PORT) {
      this.reply(V_SW_CONNECT_PORT_ACK)
    }
  }

  private reply(type: string): void {
    queueMicrotask(() => this.onmessage?.({ data: { type } } as MessageEvent))
  }

  terminate(): void {}
}

describe('Vrowzer file synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workers = []
    vi.stubGlobal('Worker', TestWorker)
    vi.stubGlobal(
      'MessageChannel',
      class {
        port1 = {}
        port2 = {}
      }
    )
    controllerMocks.postMessage.mockImplementation(message => {
      if (message.type === V_WW_CONNECT_PORT) {
        queueMicrotask(() => {
          controllerMocks.container.dispatchEvent(
            new MessageEvent('message', { data: { type: V_WW_CONNECT_PORT_ACK } })
          )
        })
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('initializes each Worker once without broadcasting initial files to the ready Web Worker', async () => {
    const files = { '/index.html': '<html></html>', '/main.js': 'export const value = 1' }
    const initialFiles = {
      ...files,
      '/dist/client/client.mjs': 'client code',
      '/dist/client/env.mjs': 'env code'
    }
    const vrowzer = Vrowzer()

    await expect(vrowzer.ready({ files })).resolves.toBe(true)

    expect(workers[0]!.messages).toEqual([
      expect.objectContaining({ type: V_WW_SETUP, files: initialFiles }),
      { type: V_SW_CONNECT_PORT }
    ])
    expect(controllerMocks.postMessage.mock.calls.map(([message]) => message)).toEqual([
      { type: 'V_FS_INIT', files: initialFiles },
      { type: V_WW_CONNECT_PORT }
    ])
  })

  test('continues sending file additions, updates, and deletions to both Workers', async () => {
    const vrowzer = Vrowzer()
    await expect(vrowzer.ready({ files: {} })).resolves.toBe(true)
    workers[0]!.messages.length = 0
    controllerMocks.postMessage.mockClear()

    vrowzer.addFile('/main.js', 'initial')
    vrowzer.updateFile('/main.js', 'updated')
    vrowzer.deleteFile('/main.js')

    const expected = [
      { type: 'V_FS_WRITE', path: '/main.js', encoding: 'text', content: 'initial' },
      { type: 'V_FS_WRITE', path: '/main.js', encoding: 'text', content: 'updated' },
      { type: 'V_FS_UNLINK', path: '/main.js' }
    ]
    expect(workers[0]!.messages).toEqual(expected)
    expect(controllerMocks.postMessage.mock.calls.map(([message]) => message)).toEqual(expected)
  })
})
