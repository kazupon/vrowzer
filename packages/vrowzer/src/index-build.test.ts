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
import { V_BW_BUILD, V_BW_READY, V_BW_RESULT } from './build-messages.ts'

import type { BuildWorkerBuildMessage } from './build-messages.ts'

const controllerMocks = vi.hoisted(() => ({
  container: new EventTarget(),
  on: vi.fn<(...args: unknown[]) => () => void>(() => () => {}),
  postMessage: vi.fn<(message: { type: string }, transfer?: Transferable[]) => void>(),
  initServiceWorker: vi.fn<() => Promise<undefined>>(async () => undefined)
}))

vi.mock('./controller.ts', () => ({
  getController: () => controllerMocks,
  getServiceWorker: () => ({ postMessage: controllerMocks.postMessage }),
  getServiceWorkerInstanceId: () => 'sw-1',
  initServiceWorker: controllerMocks.initServiceWorker
}))
vi.mock('@vrowzer/vite-dev-server/dist/client/client.mjs?raw', () => ({ default: 'client code' }))
vi.mock('@vrowzer/vite-dev-server/dist/client/env.mjs?raw', () => ({ default: 'env code' }))

import { Vrowzer, VrowzerBuildError, type VrowzerOptions } from './index.ts'

interface TestMessage {
  type: string
  id?: string | number
  files?: Record<string, string | ArrayBuffer>
  options?: Record<string, unknown>
}

/**
 * How the fake build Workers behave
 */
interface BuildBehavior {
  /**
   * `ok` reports V_BW_READY, `error` reports that the builder could not load, `none` never answers
   */
  ready: 'ok' | 'error' | 'none'
  /**
   * Answers V_BW_BUILD automatically with this result, or never when `null`
   */
  result: Record<string, unknown> | null
}

let webWorkers: TestWorker[]
let buildWorkers: TestWorker[]
let buildBehavior: BuildBehavior

class TestWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  readonly messages: TestMessage[] = []
  readonly terminate = vi.fn<() => void>()
  readonly kind: 'web' | 'build'

  constructor(url: URL | string) {
    this.kind = String(url).includes('build-worker.ts') ? 'build' : 'web'
    if (this.kind === 'build') {
      buildWorkers.push(this)
      if (buildBehavior.ready === 'ok') {
        this.reply({ type: V_BW_READY })
      } else if (buildBehavior.ready === 'error') {
        this.reply({ type: V_BW_READY, error: 'cannot load the builder' })
      }
    } else {
      webWorkers.push(this)
      this.reply({ type: V_WW_READY })
    }
  }

  postMessage(message: TestMessage): void {
    this.messages.push(message)
    if (message.type === V_WW_SETUP) {
      this.reply({ type: V_WW_SETUP_ACK })
    } else if (message.type === V_SW_CONNECT_PORT) {
      this.reply({ type: V_SW_CONNECT_PORT_ACK })
    } else if (message.type === 'V_FS_WRITE' || message.type === 'V_FS_UNLINK') {
      this.reply({ type: 'V_FS_ACK', id: message.id })
    } else if (message.type === V_BW_BUILD && buildBehavior.result) {
      this.reply({ type: V_BW_RESULT, id: message.id, ...buildBehavior.result })
    }
  }

  /**
   * The build request that the runtime sent
   */
  get buildMessage(): BuildWorkerBuildMessage {
    const message = this.messages.find(item => item.type === V_BW_BUILD)
    if (!message) {
      throw new Error('No build request was sent to the build Worker')
    }
    return message as unknown as BuildWorkerBuildMessage
  }

  send(data: object): void {
    this.onmessage?.({ data } as MessageEvent)
  }

  private reply(data: object): void {
    queueMicrotask(() => this.onmessage?.({ data } as MessageEvent))
  }
}

async function readyInstance(
  options?: VrowzerOptions,
  files: Record<string, string | ArrayBuffer> = {}
) {
  const vrowzer = Vrowzer(options)
  await expect(vrowzer.ready({ files })).resolves.toBe(true)
  return vrowzer
}

async function settle(): Promise<void> {
  for (let index = 0; index < 10; index++) {
    await Promise.resolve()
  }
}

async function isPending(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  promise.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    }
  )
  await settle()
  return !settled
}

const okResult = { ok: true, files: { 'my-lib.js': 'export {}' }, warnings: [] }

beforeEach(() => {
  vi.clearAllMocks()
  webWorkers = []
  buildWorkers = []
  buildBehavior = { ready: 'ok', result: okResult }
  controllerMocks.container = new EventTarget()
  vi.stubGlobal('Worker', TestWorker)
  vi.stubGlobal('__VROWZER_INTERNAL_BUILD__', true)
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = {}
      port2 = {}
    }
  )
  controllerMocks.postMessage.mockImplementation(message => {
    if (message.type === V_WW_CONNECT_PORT) {
      const { runtimeId } = message as { runtimeId?: string }
      queueMicrotask(() => {
        controllerMocks.container.dispatchEvent(
          new MessageEvent('message', { data: { type: V_WW_CONNECT_PORT_ACK, runtimeId } })
        )
      })
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Vrowzer.build() state', () => {
  test('rejects before ready() resolves, without a build Worker', async () => {
    const vrowzer = Vrowzer()

    await expect(vrowzer.build()).rejects.toThrow(
      '[Vrowzer] build() can only be called after ready() resolves to true (current state: idle)'
    )
    expect(buildWorkers).toHaveLength(0)
  })

  test('rejects after dispose()', async () => {
    const vrowzer = await readyInstance()
    await vrowzer.dispose()

    await expect(vrowzer.build()).rejects.toThrow(
      '[Vrowzer] build() cannot be called after dispose()'
    )
    expect(buildWorkers).toHaveLength(0)
  })

  test('rejects when the plugin did not enable it', async () => {
    vi.stubGlobal('__VROWZER_INTERNAL_BUILD__', false)
    const vrowzer = await readyInstance()

    await expect(vrowzer.build()).rejects.toThrow(
      '[Vrowzer] build() is not enabled. Set `build: true` in the options of Vrowzer() from @vrowzer/vite-plugin.'
    )
    expect(buildWorkers).toHaveLength(0)
  })

  test('rejects without the plugin', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('Worker', TestWorker)
    vi.stubGlobal(
      'MessageChannel',
      class {
        port1 = {}
        port2 = {}
      }
    )
    const vrowzer = await readyInstance()

    await expect(vrowzer.build()).rejects.toThrow('[Vrowzer] build() is not enabled.')
    expect(buildWorkers).toHaveLength(0)
  })

  test('rejects a build while another one is running', async () => {
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const first = vrowzer.build()

    await expect(vrowzer.build()).rejects.toThrow('[Vrowzer] build() is already running.')
    expect(buildWorkers).toHaveLength(1)
    expect(await isPending(first)).toBe(true)

    buildWorkers[0]!.send({ type: V_BW_RESULT, id: buildWorkers[0]!.buildMessage.id, ...okResult })
    await expect(first).resolves.toEqual({ files: okResult.files, warnings: [] })
    buildBehavior.result = okResult
    await expect(vrowzer.build()).resolves.toEqual({ files: okResult.files, warnings: [] })
  })

  test('rejects with the reason of an aborted signal, without a build Worker', async () => {
    const vrowzer = await readyInstance()
    const reason = new Error('aborted before')

    await expect(vrowzer.build({ signal: AbortSignal.abort(reason) })).rejects.toBe(reason)
    expect(buildWorkers).toHaveLength(0)
  })
})

describe('Vrowzer.build() files', () => {
  test('sends the files of ready() with the default index.html, without the client files', async () => {
    const binary = new Uint8Array([1, 2, 3]).buffer
    const vrowzer = await readyInstance(undefined, {
      '/src/index.ts': 'export const a = 1',
      '/logo.png': binary
    })

    await vrowzer.build()

    const { files } = buildWorkers[0]!.buildMessage
    expect(Object.keys(files).sort()).toEqual(['/index.html', '/logo.png', '/src/index.ts'])
    expect(files['/index.html']).toContain('<script type="module" src="/main.js"></script>')
    expect(files['/logo.png']).not.toBe(binary)
    expect([...new Uint8Array(files['/logo.png'] as ArrayBuffer)]).toEqual([1, 2, 3])
  })

  test('includes the file operations called before', async () => {
    const vrowzer = await readyInstance(undefined, {
      '/index.html': '<html></html>',
      '/src/a.ts': 'a',
      '/src/b.ts': 'b'
    })
    const binary = new Uint8Array([4, 5])

    await vrowzer.addFile('/src/c.ts', 'c')
    await vrowzer.updateFile('/src/a.ts', 'a2')
    await vrowzer.deleteFile('/src/b.ts')
    await vrowzer.addFile('/data.bin', binary.buffer)
    binary[0] = 9
    await vrowzer.build()

    const { files } = buildWorkers[0]!.buildMessage
    expect(files).toEqual({
      '/index.html': '<html></html>',
      '/src/a.ts': 'a2',
      '/src/c.ts': 'c',
      '/data.bin': expect.any(ArrayBuffer)
    })
    expect([...new Uint8Array(files['/data.bin'] as ArrayBuffer)]).toEqual([4, 5])
  })

  test('builds the files as they are when build() is called', async () => {
    buildBehavior.ready = 'none'
    const vrowzer = await readyInstance(undefined, { '/src/a.ts': 'before' })

    const result = vrowzer.build()
    const update = vrowzer.updateFile('/src/a.ts', 'after')
    const add = vrowzer.addFile('/src/new.ts', 'new')
    await Promise.all([update, add])
    buildWorkers[0]!.send({ type: V_BW_READY })
    await settle()

    const { files } = buildWorkers[0]!.buildMessage
    expect(files['/src/a.ts']).toBe('before')
    expect(files).not.toHaveProperty('/src/new.ts')
    buildWorkers[0]!.send({ type: V_BW_RESULT, id: buildWorkers[0]!.buildMessage.id, ...okResult })
    await expect(result).resolves.toEqual({ files: okResult.files, warnings: [] })

    buildBehavior.ready = 'ok'
    await vrowzer.build()
    expect(buildWorkers[1]!.buildMessage.files).toMatchObject({
      '/src/a.ts': 'after',
      '/src/new.ts': 'new'
    })
  })

  test('sends the options without the signal', async () => {
    const vrowzer = await readyInstance()
    const options = {
      mode: 'staging',
      define: { __VERSION__: '"1.0.0"' },
      build: { lib: { entry: '/src/index.ts', fileName: 'my-lib' }, minify: false }
    }

    await vrowzer.build({ ...options, signal: new AbortController().signal })

    expect(buildWorkers[0]!.buildMessage.options).toEqual(options)
  })
})

describe('Vrowzer.build() result', () => {
  test('resolves with the outputs and the warnings, and terminates the build Worker', async () => {
    const binary = new Uint8Array([1]).buffer
    buildBehavior.result = {
      ok: true,
      files: { 'my-lib.js': 'export {}', 'assets/a.bin': binary },
      warnings: [{ message: '[plugin test] careful' }]
    }
    const vrowzer = await readyInstance()

    await expect(vrowzer.build()).resolves.toEqual({
      files: { 'my-lib.js': 'export {}', 'assets/a.bin': binary },
      warnings: [{ message: '[plugin test] careful' }]
    })
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
    expect(webWorkers[0]!.terminate).not.toHaveBeenCalled()
  })

  test('creates a new build Worker for each build', async () => {
    const vrowzer = await readyInstance()

    await vrowzer.build()
    await vrowzer.build()

    expect(buildWorkers).toHaveLength(2)
    expect(buildWorkers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true)
  })

  test('rejects with a VrowzerBuildError that has the errors of the build', async () => {
    const errors = [
      {
        code: 'PARSE_ERROR',
        message: '[PARSE_ERROR] Unexpected token\n  ╭─[ src/index.ts:1:18 ]',
        id: '/src/index.ts',
        loc: { line: 1, column: 17, file: '/src/index.ts' }
      },
      { code: 'PLUGIN_ERROR', message: 'boom', plugin: 'my-plugin' }
    ]
    buildBehavior.result = { ok: false, errors }
    const vrowzer = await readyInstance()

    const error = await vrowzer.build().catch((error: unknown) => error)

    expect(error).toBeInstanceOf(VrowzerBuildError)
    expect(error).toMatchObject({
      name: 'VrowzerBuildError',
      message: '[Vrowzer] build() failed: [PARSE_ERROR] Unexpected token (and 1 more)',
      errors
    })
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
  })

  test('ignores the results of other builds', async () => {
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const result = vrowzer.build()
    await settle()
    const worker = buildWorkers[0]!
    const { id } = worker.buildMessage

    worker.send({ type: V_BW_RESULT, id: id + 1, ...okResult })
    worker.send({ type: 'OTHER' })
    expect(await isPending(result)).toBe(true)

    worker.send({ type: V_BW_RESULT, id, ...okResult })
    await expect(result).resolves.toEqual({ files: okResult.files, warnings: [] })
  })

  test('rejects when the build Worker cannot load the builder', async () => {
    buildBehavior.ready = 'error'
    const vrowzer = await readyInstance()

    await expect(vrowzer.build()).rejects.toThrow(
      '[Vrowzer] The build Worker could not load the builder: cannot load the builder'
    )
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
  })

  test('rejects when the build Worker reports an error', async () => {
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const result = vrowzer.build()
    await settle()

    buildWorkers[0]!.onerror?.({ message: 'Uncaught SyntaxError' } as ErrorEvent)

    await expect(result).rejects.toThrow('[Vrowzer] The build Worker failed: Uncaught SyntaxError')
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
  })

  test('rejects when the options cannot be sent', async () => {
    const vrowzer = await readyInstance()
    buildBehavior.result = null
    const result = vrowzer.build()
    const worker = buildWorkers[0]!
    worker.postMessage = () => {
      throw new DOMException('function could not be cloned', 'DataCloneError')
    }

    await expect(result).rejects.toThrow(
      '[Vrowzer] build() could not send the options to the build Worker: function could not be cloned'
    )
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
})

describe('Vrowzer.build() timeout, abort and dispose', () => {
  test('times out after 120000ms by default', async () => {
    vi.useFakeTimers()
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const error = vrowzer.build().then(
      () => undefined,
      (error: unknown) => error
    )

    await vi.advanceTimersByTimeAsync(119_999)
    expect(buildWorkers[0]!.terminate).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(await error).toMatchObject({ message: '[Vrowzer] build() timed out after 120000ms' })
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
  })

  test('uses buildTimeout, and builds again with a new build Worker after a timeout', async () => {
    vi.useFakeTimers()
    buildBehavior.result = null
    const vrowzer = await readyInstance({ buildTimeout: 5000 })
    const error = vrowzer.build().then(
      () => undefined,
      (error: unknown) => error
    )

    await vi.advanceTimersByTimeAsync(5000)
    expect(await error).toMatchObject({ message: '[Vrowzer] build() timed out after 5000ms' })

    buildBehavior.result = okResult
    await expect(vrowzer.build()).resolves.toEqual({ files: okResult.files, warnings: [] })
    expect(buildWorkers).toHaveLength(2)
    expect(buildWorkers[1]!.terminate).toHaveBeenCalledOnce()
  })

  test('rejects with the reason when the signal aborts, and terminates the build Worker', async () => {
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const controller = new AbortController()
    const result = vrowzer.build({ signal: controller.signal })
    await settle()
    const reason = new Error('cancelled by the user')

    controller.abort(reason)

    await expect(result).rejects.toBe(reason)
    expect(buildWorkers[0]!.terminate).toHaveBeenCalledOnce()
  })

  test('rejects a running build on dispose(), and terminates the build Worker', async () => {
    buildBehavior.result = null
    const vrowzer = await readyInstance()
    const result = vrowzer.build()
    await settle()

    await vrowzer.dispose()

    await expect(result).rejects.toThrow('[Vrowzer] build() was cancelled by dispose()')
    expect(buildWorkers[0]!.terminate).toHaveBeenCalled()
    await expect(vrowzer.build()).rejects.toThrow('cannot be called after dispose()')
  })
})

describe('Vrowzer.build() pacing', () => {
  async function buildFourTimes(vrowzer: Awaited<ReturnType<typeof readyInstance>>) {
    for (let index = 0; index < 4; index++) {
      await expect(vrowzer.build()).resolves.toEqual({ files: okResult.files, warnings: [] })
    }
    expect(buildWorkers).toHaveLength(4)
  }

  test('waits before creating a build Worker when 4 closed within 2.5 seconds', async () => {
    vi.useFakeTimers()
    const vrowzer = await readyInstance({ buildTimeout: 1000 })
    await buildFourTimes(vrowzer)

    const fifth = vrowzer.build()
    await vi.advanceTimersByTimeAsync(2499)
    expect(buildWorkers).toHaveLength(4)
    await vi.advanceTimersByTimeAsync(1)

    // The wait does not count toward buildTimeout
    await expect(fifth).resolves.toEqual({ files: okResult.files, warnings: [] })
    expect(buildWorkers).toHaveLength(5)
  })

  test('does not wait when the closed build Workers had time to stop', async () => {
    vi.useFakeTimers()
    const vrowzer = await readyInstance()
    await buildFourTimes(vrowzer)
    await vi.advanceTimersByTimeAsync(2500)

    const fifth = vrowzer.build()
    await settle()

    expect(buildWorkers).toHaveLength(5)
    await expect(fifth).resolves.toEqual({ files: okResult.files, warnings: [] })
  })

  test('rejects a build while another one waits', async () => {
    vi.useFakeTimers()
    const vrowzer = await readyInstance()
    await buildFourTimes(vrowzer)
    const waiting = vrowzer.build()

    await expect(vrowzer.build()).rejects.toThrow('[Vrowzer] build() is already running.')
    await vi.advanceTimersByTimeAsync(2500)
    await expect(waiting).resolves.toEqual({ files: okResult.files, warnings: [] })
  })

  test('cancels a waiting build with the signal or dispose(), without a build Worker', async () => {
    vi.useFakeTimers()
    const vrowzer = await readyInstance()
    await buildFourTimes(vrowzer)
    const controller = new AbortController()
    const reason = new Error('cancelled while waiting')

    const aborted = vrowzer.build({ signal: controller.signal })
    await settle()
    controller.abort(reason)
    await expect(aborted).rejects.toBe(reason)

    const disposed = vrowzer.build()
    await settle()
    const disposal = vrowzer.dispose()
    await expect(disposed).rejects.toThrow('[Vrowzer] build() was cancelled by dispose()')
    await disposal

    await vi.advanceTimersByTimeAsync(2500)
    expect(buildWorkers).toHaveLength(4)
  })
})
