import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type MessageListener = (event: { data: unknown; source: unknown }) => void

const mocks = vi.hoisted(() => ({
  handleMessage: vi.fn<(message: unknown) => void>(),
  listen: vi.fn<() => Promise<void>>()
}))

vi.mock('@vrowzer/fs', () => ({
  fs: {
    mkdirSync: vi.fn<() => void>(),
    writeFileSync: vi.fn<() => void>()
  },
  vol: {
    fromJSON: vi.fn<() => void>()
  }
}))
vi.mock('@vrowzer/fs/watcher', () => ({
  V_FS_ACK: 'V_FS_ACK',
  createFileSystemSubscriber: () => ({ watcher: {}, handleMessage: mocks.handleMessage })
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))
vi.mock('@vrowzer/vite-dev-server/service-worker', () => ({
  createServer: () => mocks.listen
}))

import { initServiceWorker } from './service-worker-core.ts'

let listeners: Map<string, MessageListener>

function createClient() {
  return { id: 'client-1', postMessage: vi.fn<(message: unknown) => void>() }
}

function receive(data: unknown, source: unknown): void {
  listeners.get('message')!({ data, source })
}

describe('initServiceWorker file synchronization', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.handleMessage.mockReset()
    // Keep the server starting, so that only message handling runs
    mocks.listen.mockReturnValue(new Promise<void>(() => {}))
    listeners = new Map()
    vi.stubGlobal('self', {
      location: { href: 'https://vrowzer.test/service-worker.js' },
      addEventListener: (type: string, listener: MessageListener) => {
        listeners.set(type, listener)
      }
    })
    await initServiceWorker()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test.each([
    { type: 'V_FS_WRITE', id: 'op-1', path: '/main.ts', encoding: 'text', content: 'test' },
    { type: 'V_FS_UNLINK', id: 'op-1', path: '/main.ts' }
  ])('acknowledges $type to the sending client after applying it', message => {
    const client = createClient()
    mocks.handleMessage.mockImplementation(() => {
      expect(client.postMessage).not.toHaveBeenCalled()
    })

    receive(message, client)

    expect(mocks.handleMessage).toHaveBeenCalledExactlyOnceWith(message)
    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'V_FS_ACK', id: 'op-1' })
  })

  test('acknowledges with the error when writing the file fails', () => {
    const client = createClient()
    mocks.handleMessage.mockImplementation(() => {
      throw new TypeError('invalid content')
    })

    receive({ type: 'V_FS_WRITE', id: 'op-2', path: '/main.ts', content: 'x' }, client)

    expect(client.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'V_FS_ACK',
      id: 'op-2',
      error: { name: 'TypeError', message: 'invalid content' }
    })
  })

  test('does not acknowledge messages without an id', () => {
    const client = createClient()

    receive({ type: 'V_FS_WRITE', path: '/main.ts', content: 'x' }, client)

    expect(mocks.handleMessage).toHaveBeenCalledOnce()
    expect(client.postMessage).not.toHaveBeenCalled()
  })
})
