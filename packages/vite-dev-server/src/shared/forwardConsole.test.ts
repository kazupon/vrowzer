import { setTimeout } from 'node:timers/promises'
import { describe, expect, test, vi } from 'vite-plus/test'
import {
  formatConsoleArgs,
  setupForwardConsoleHandler,
} from './forwardConsole'
import {
  type NormalizedModuleRunnerTransport,
  SendBeforeConnectError,
} from './moduleRunnerTransport'

describe('formatConsoleArgs', () => {
  test('formats placeholders', () => {
    expect(
      formatConsoleArgs([
        'format: string=%s number=%d int=%i float=%f json=%j object=%o object2=%O sym=%d style=%c literal=%% trailing',
        'hello',
        12.9,
        '42px',
        '3.5',
        { id: 1 },
        { enabled: true },
        { nested: { deep: 1 } },
        Symbol.for('x'),
        'color:red',
        'done',
      ]),
    ).toMatchInlineSnapshot(
      `"format: string=hello number=12.9 int=42 float=3.5 json={"id":1} object={"enabled":true} object2={"nested":{"deep":1}} sym=NaN style= literal=% trailing done"`,
    )

    expect(
      formatConsoleArgs(['num=%d int=%i pct=%% miss=%s sym=%d', 3.14, '42px']),
    ).toMatchInlineSnapshot(`"num=3.14 int=42 pct=% miss=%s sym=%d"`)
  })

  test('stringifies diverse non-template arguments', () => {
    const topError = new Error('boom')
    topError.stack = undefined

    const nestedError = new Error('nested')
    nestedError.stack = undefined

    const circular: any = {
      ok: true,
      big: 2n,
      err: nestedError,
    }
    circular.self = circular

    function sampleFn() {
      return undefined
    }

    expect(
      formatConsoleArgs([
        1n,
        undefined,
        true,
        Symbol.for('s'),
        sampleFn,
        topError,
        circular,
      ]),
    ).toMatchInlineSnapshot(
      `"1n undefined true Symbol(s) [Function: sampleFn] Error: boom {"ok":true,"big":"2n","err":{"name":"Error","message":"nested"},"self":"[Circular]"}"`,
    )
  })
})

describe('setupForwardConsoleHandler', () => {
  function createMockConsole() {
    return {
      error: vi.fn<(...args: any[]) => void>(),
      warn: vi.fn<(...args: any[]) => void>(),
      info: vi.fn<(...args: any[]) => void>(),
      log: vi.fn<(...args: any[]) => void>(),
      debug: vi.fn<(...args: any[]) => void>(),
    } as unknown as Console
  }

  function createMockTransport(
    send: (...args: any[]) => Promise<void>,
  ): NormalizedModuleRunnerTransport {
    return {
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      send,
      invoke: () => Promise.resolve({ result: undefined } as any),
    }
  }

  test('forwards logs while preserving the original console output', async () => {
    const send = vi.fn<(...args: any[]) => Promise<void>>(() =>
      Promise.resolve()
    )
    const transport = createMockTransport(send)
    const console = createMockConsole()
    const originalLog = console.log

    setupForwardConsoleHandler(
      transport,
      {
        enabled: true,
        unhandledErrors: false,
        logLevels: ['log'],
      },
      console,
    )

    console.log('value=%d', 42)
    await vi.waitFor(() => expect(send).toHaveBeenCalled())

    expect(originalLog).toHaveBeenCalledWith('value=%d', 42)
    expect(send).toHaveBeenCalledWith({
      type: 'custom',
      event: 'vite:forward-console',
      data: {
        type: 'log',
        data: {
          level: 'log',
          message: 'value=42',
        },
      },
    })
  })

  test('ignores SendBeforeConnectError from transport.send', async () => {
    const transport = createMockTransport(() =>
      Promise.reject(new SendBeforeConnectError('not connected yet')),
    )
    const console = createMockConsole()

    setupForwardConsoleHandler(
      transport,
      {
        enabled: true,
        unhandledErrors: false,
        logLevels: ['log'],
      },
      console,
    )

    console.log('hi')
    await setTimeout(50)

    expect(console.error).not.toHaveBeenCalled()
  })

  test('logs errors from transport.send', async () => {
    const transport = createMockTransport(() =>
      Promise.reject(new Error('other error')),
    )
    const console = createMockConsole()

    setupForwardConsoleHandler(
      transport,
      {
        enabled: true,
        unhandledErrors: false,
        logLevels: ['log'],
      },
      console,
    )

    console.log('hi')
    await setTimeout(50)

    expect(console.error).toHaveBeenCalledWith(
      'Failed to send error to Vite server:',
      new Error('other error'),
    )
  })
})
