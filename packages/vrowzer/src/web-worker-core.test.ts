import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type TestSubscriber = {
  handleMessage: (message: unknown) => void
}

type TestServerOptions = {
  onUnhandledMessage: (event: MessageEvent) => Promise<void>
}

type TestServer = {
  fileSystem: object
  waitForFileChange: (file: string) => Promise<void>
}

const fileSystemMocks = vi.hoisted(() => {
  const subscriber = {
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
  const listen = vi.fn<(timeout?: number) => Promise<TestServer>>()
  return {
    createServer:
      vi.fn<(_scope: unknown, options: TestServerOptions) => { listen: typeof listen }>(),
    listen,
    waitForFileChange: vi.fn<(file: string) => Promise<void>>()
  }
})

vi.mock('@vrowzer/fs/watcher', () => ({
  V_FS_ACK: 'V_FS_ACK',
  createFileSystemSubscriber: fileSystemMocks.createFileSystemSubscriber,
  createVirtualFSWatcher: fileSystemMocks.createVirtualFSWatcher
}))
vi.mock('@vrowzer/vite-dev-server/web-worker', () => ({
  createServer: serverMocks.createServer
}))

import { initWebWorker } from './web-worker-core.ts'

let postMessage: ReturnType<typeof vi.fn<(message: unknown) => void>>

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function startWorker(): Promise<TestServerOptions> {
  serverMocks.listen.mockResolvedValue({
    fileSystem: {},
    waitForFileChange: serverMocks.waitForFileChange
  })
  await initWebWorker()
  return serverMocks.createServer.mock.calls[0]![1]
}

function receive(options: TestServerOptions, data: unknown): Promise<void> {
  return options.onUnhandledMessage({ data } as MessageEvent)
}

describe('initWebWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fileSystemMocks.createVirtualFSWatcher.mockReturnValue(fileSystemMocks.watcher)
    fileSystemMocks.createFileSystemSubscriber.mockReturnValue(fileSystemMocks.subscriber)
    fileSystemMocks.subscriber.handleMessage.mockReset()
    serverMocks.createServer.mockReturnValue({ listen: serverMocks.listen })
    serverMocks.waitForFileChange.mockReset()
    serverMocks.waitForFileChange.mockResolvedValue(undefined)
    postMessage = vi.fn<(message: unknown) => void>()
    vi.stubGlobal('self', { postMessage })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('uses the server filesystem and flushes queued messages', async () => {
    let resolveListen!: (server: TestServer) => void
    const listening = new Promise<TestServer>(resolve => {
      resolveListen = resolve
    })
    const fileSystem = {}
    serverMocks.listen.mockReturnValue(listening)

    const initializing = initWebWorker()
    await vi.waitFor(() => expect(serverMocks.createServer).toHaveBeenCalledOnce())
    const options = serverMocks.createServer.mock.calls[0]![1]
    expect(options).toMatchObject({ protectRuntimeConfig: true })
    const queuedMessage = { type: 'V_FS_WRITE', path: '/main.ts', content: 'test' }
    await options.onUnhandledMessage({ data: queuedMessage } as MessageEvent)

    resolveListen({ fileSystem, waitForFileChange: serverMocks.waitForFileChange })
    await initializing

    expect(serverMocks.listen).toHaveBeenCalledWith(0)
    expect(fileSystemMocks.createFileSystemSubscriber).toHaveBeenCalledWith(fileSystem, {
      watcher: fileSystemMocks.watcher
    })
    expect(fileSystemMocks.subscriber.handleMessage).toHaveBeenCalledWith(queuedMessage)
  })

  test.each([
    { type: 'V_FS_WRITE', id: 'op-1', path: '/main.ts', encoding: 'text', content: 'test' },
    { type: 'V_FS_UNLINK', id: 'op-1', path: '/main.ts' }
  ])('acknowledges $type after the file change is processed', async message => {
    const calls: string[] = []
    const processing = deferred()
    fileSystemMocks.subscriber.handleMessage.mockImplementation(() => {
      calls.push('handleMessage')
    })
    serverMocks.waitForFileChange.mockImplementation(file => {
      calls.push(`waitForFileChange:${file}`)
      return processing.promise
    })
    const options = await startWorker()

    await receive(options, message)

    // The change is taken right after the message is applied
    expect(calls).toEqual(['handleMessage', 'waitForFileChange:/main.ts'])
    expect(fileSystemMocks.subscriber.handleMessage).toHaveBeenCalledWith(message)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(postMessage).not.toHaveBeenCalled()

    processing.resolve()
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'V_FS_ACK', id: 'op-1' })
    })
  })

  test('acknowledges with the error when processing the file change fails', async () => {
    serverMocks.waitForFileChange.mockRejectedValue(new TypeError('watchChange failed'))
    const options = await startWorker()

    await receive(options, { type: 'V_FS_WRITE', id: 'op-2', path: '/main.ts', content: 'x' })

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({
        type: 'V_FS_ACK',
        id: 'op-2',
        error: { name: 'TypeError', message: 'watchChange failed' }
      })
    })
  })

  test('acknowledges with the error when writing the file fails', async () => {
    fileSystemMocks.subscriber.handleMessage.mockImplementation(() => {
      throw new Error('EISDIR: illegal operation on a directory')
    })
    const options = await startWorker()

    await receive(options, { type: 'V_FS_WRITE', id: 'op-3', path: '/src', content: 'x' })

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({
        type: 'V_FS_ACK',
        id: 'op-3',
        error: { name: 'Error', message: 'EISDIR: illegal operation on a directory' }
      })
    })
    expect(serverMocks.waitForFileChange).not.toHaveBeenCalled()
  })

  test('acknowledges queued messages after they are processed', async () => {
    let resolveListen!: (server: TestServer) => void
    serverMocks.listen.mockReturnValue(
      new Promise<TestServer>(resolve => {
        resolveListen = resolve
      })
    )
    const initializing = initWebWorker()
    await vi.waitFor(() => expect(serverMocks.createServer).toHaveBeenCalledOnce())
    const options = serverMocks.createServer.mock.calls[0]![1]

    await receive(options, { type: 'V_FS_UNLINK', id: 'op-4', path: '/old.ts' })
    expect(postMessage).not.toHaveBeenCalled()

    resolveListen({ fileSystem: {}, waitForFileChange: serverMocks.waitForFileChange })
    await initializing

    expect(serverMocks.waitForFileChange).toHaveBeenCalledWith('/old.ts')
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'V_FS_ACK', id: 'op-4' })
    })
  })

  test('does not acknowledge messages without an id', async () => {
    const options = await startWorker()

    await receive(options, { type: 'V_FS_WRITE', path: '/main.ts', content: 'x' })
    await new Promise(resolve => setTimeout(resolve, 0))

    // The change is still taken, so that it is not left for a later message
    expect(serverMocks.waitForFileChange).toHaveBeenCalledWith('/main.ts')
    expect(postMessage).not.toHaveBeenCalled()
  })
})
