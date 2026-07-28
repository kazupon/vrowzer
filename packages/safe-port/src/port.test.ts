import { describe, expect, expectTypeOf, test, vi } from 'vite-plus/test'
import { safeMessagePort } from './port.ts'

describe('safeMessagePort', () => {
  const createPortPair = () => {
    const channel = new MessageChannel()
    return { port1: channel.port1, port2: channel.port2 }
  }

  describe('basic message communication', () => {
    test('postMessage and on message', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      safe2.on('message', handler)

      safe1.postMessage({ greeting: 'hello' })

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).toHaveBeenCalledTimes(1)
      // @ts-ignore -- for testing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- FIXME: event.data is typed as unknown, but we know it's { greeting: string } from the test setup
      expect(handler.mock.calls[0][0].data).toEqual({ greeting: 'hello' })
    })

    test('start method', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)
      expect(() => safe.start()).not.toThrow()
    })
  })

  describe('`Emittable` interface', () => {
    test('`on` and `off`', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      safe2.on('message', handler)
      safe2.off('message', handler)

      safe1.postMessage('test')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).not.toHaveBeenCalled()
    })

    test('`once`', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      safe2.once('message', handler)

      safe1.postMessage('first')
      safe1.postMessage('second')
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('stop function from `on`', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      const stop = safe2.on('message', handler)
      stop()

      safe1.postMessage('test')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('`close` and `Disposable`', () => {
    test('close releases all listeners', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      safe2.on('message', handler)
      safe2.close()

      safe1.postMessage('after close')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).not.toHaveBeenCalled()
    })

    test('`Symbol.dispose` calls close', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const handler = vi.fn()
      safe2.on('message', handler)
      safe2[Symbol.dispose]()

      safe1.postMessage('after dispose')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).not.toHaveBeenCalled()
    })

    test('`using` syntax auto-disposes', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const handler = vi.fn()

      {
        using safe2 = safeMessagePort(port2)
        safe2.on('message', handler)
        safe1.postMessage('inside')
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      safe1.postMessage('outside')
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('multiple close calls do not throw', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)
      expect(() => {
        safe.close()
        safe.close()
      }).not.toThrow()
    })
  })

  describe('`MessagePort` interface passthrough', () => {
    test('`addEventListener` and `removeEventListener`', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)
      const handler = vi.fn()

      safe.addEventListener('message', handler)
      safe.removeEventListener('message', handler)
    })

    test('`onmessage` property', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)
      const handler = vi.fn()

      safe.onmessage = handler
      expect(safe.onmessage).toBe(handler)
    })

    test('`raw` property exposes the original MessagePort', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)
      expect(safe.raw).toBe(port1)
    })
  })

  describe('type safety', () => {
    test('event.data and postMessage are typed', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort<{ greeting: string }>(port1)

      safe.on('message', event => {
        expectTypeOf(event.data).toEqualTypeOf<{ greeting: string }>()
      })

      // postMessage is also type-checked
      safe.postMessage({ greeting: 'hello' })
    })
  })
})
