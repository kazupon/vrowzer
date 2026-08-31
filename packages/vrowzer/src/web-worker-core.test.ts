import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type TestSubscriber = {
  handleMessage: (message: unknown) => void
}

type TestServerOptions = {
  onUnhandledMessage: (event: MessageEvent) => Promise<void>
}

const fileSystemMocks = vi.hoisted(() => {
  const subscriber: TestSubscriber = {
    handleMessage: vi.fn<(message: unknown) => void>()
  }
  return {
    createFileSystemSubscriber:
      vi.fn<(fileSystem: object, options: { watcher: object }) => TestSubscriber>(),
    createVirtualFSWatcher: vi.fn<() => object>(),
    subscriber,
    watcher: {}
  }
})

const serverMocks = vi.hoisted(() => {
  const listen = vi.fn<(timeout?: number) => Promise<{ fileSystem: object }>>()
  return {
    createServer:
      vi.fn<(_scope: unknown, options: TestServerOptions) => { listen: typeof listen }>(),
    listen
  }
})

vi.mock('@vrowzer/fs/watcher', () => ({
  createFileSystemSubscriber: fileSystemMocks.createFileSystemSubscriber,
  createVirtualFSWatcher: fileSystemMocks.createVirtualFSWatcher
}))
vi.mock('@vrowzer/vite-dev-server/web-worker', () => ({
  createServer: serverMocks.createServer
}))

import { initWebWorker } from './web-worker-core.ts'

describe('initWebWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fileSystemMocks.createVirtualFSWatcher.mockReturnValue(fileSystemMocks.watcher)
    fileSystemMocks.createFileSystemSubscriber.mockReturnValue(fileSystemMocks.subscriber)
    serverMocks.createServer.mockReturnValue({ listen: serverMocks.listen })
    vi.stubGlobal('self', {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('uses the server filesystem and flushes queued messages', async () => {
    let resolveListen!: (server: { fileSystem: object }) => void
    const listening = new Promise<{ fileSystem: object }>(resolve => {
      resolveListen = resolve
    })
    const fileSystem = {}
    serverMocks.listen.mockReturnValue(listening)

    const initializing = initWebWorker()
    await vi.waitFor(() => expect(serverMocks.createServer).toHaveBeenCalledOnce())
    const options = serverMocks.createServer.mock.calls[0]![1]
    const queuedMessage = { type: 'V_FS_WRITE', path: '/main.ts', content: 'test' }
    await options.onUnhandledMessage({ data: queuedMessage } as MessageEvent)

    resolveListen({ fileSystem })
    await initializing

    expect(serverMocks.listen).toHaveBeenCalledWith(0)
    expect(fileSystemMocks.createFileSystemSubscriber).toHaveBeenCalledWith(fileSystem, {
      watcher: fileSystemMocks.watcher
    })
    expect(fileSystemMocks.subscriber.handleMessage).toHaveBeenCalledWith(queuedMessage)
  })
})
