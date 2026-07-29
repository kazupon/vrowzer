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
      // oxlint-disable-next-line typescript/no-unsafe-member-access -- FIXME: event.data is typed as unknown, but we know it's { greeting: string } from the test setup
      expect(handler.mock.calls[0]![0].data).toEqual({ greeting: 'hello' })
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

  // ---------------------------------------------------------------------------
  // Goodbye protocol
  // ---------------------------------------------------------------------------

  describe('goodbye protocol', () => {
    test('remote close fires close event', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const closeHandler = vi.fn()
      safe2.on('close', closeHandler)

      safe1.close()

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('local close fires close event', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)

      const closeHandler = vi.fn()
      safe.on('close', closeHandler)

      safe.close()

      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('close handler receives no payload', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)

      const closeHandler = vi.fn()
      safe.on('close', closeHandler)

      safe.close()

      expect(closeHandler).toHaveBeenCalledWith()
    })

    test('once close fires only once', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const closeHandler = vi.fn()
      safe2.once('close', closeHandler)

      safe1.close()

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('simultaneous close does not throw', () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      expect(() => {
        safe1.close()
        safe2.close()
      }).not.toThrow()
    })

    test('close on already-closed is idempotent', () => {
      const { port1 } = createPortPair()
      const safe = safeMessagePort(port1)

      const closeHandler = vi.fn()
      safe.on('close', closeHandler)

      safe.close()
      safe.close()

      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('internal messages filtered from message handlers', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1)
      const safe2 = safeMessagePort(port2)

      const messageHandler = vi.fn()
      safe2.on('message', messageHandler)

      // Send a user message first
      safe1.postMessage('user message')
      await new Promise(resolve => setTimeout(resolve, 10))

      // Close sends a goodbye internal message
      safe1.close()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Only the user message should have been received
      expect(messageHandler).toHaveBeenCalledTimes(1)
      // oxlint-disable-next-line typescript/no-unsafe-member-access
      expect(messageHandler.mock.calls[0]![0].data).toBe('user message')
    })

    test('normal messages still delivered after heartbeat enabled', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, { heartbeat: { interval: 100, timeout: 500 } })
      const safe2 = safeMessagePort(port2, { heartbeat: { interval: 100, timeout: 500 } })

      const messageHandler = vi.fn()
      safe2.on('message', messageHandler)

      safe1.postMessage('hello with heartbeat')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(messageHandler).toHaveBeenCalledTimes(1)
      // oxlint-disable-next-line typescript/no-unsafe-member-access
      expect(messageHandler.mock.calls[0]![0].data).toBe('hello with heartbeat')

      safe1.close()
      safe2.close()
    })

    test('ping/pong filtered from message handlers', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, { heartbeat: { interval: 50, timeout: 500 } })
      const safe2 = safeMessagePort(port2, { heartbeat: { interval: 50, timeout: 500 } })

      const messageHandler1 = vi.fn()
      const messageHandler2 = vi.fn()
      safe1.on('message', messageHandler1)
      safe2.on('message', messageHandler2)

      // Wait for a few heartbeat cycles
      await new Promise(resolve => setTimeout(resolve, 200))

      // No user messages should have been received (only internal ping/pong)
      expect(messageHandler1).not.toHaveBeenCalled()
      expect(messageHandler2).not.toHaveBeenCalled()

      safe1.close()
      safe2.close()
    })
  })

  // ---------------------------------------------------------------------------
  // Heartbeat protocol
  // ---------------------------------------------------------------------------

  describe('heartbeat protocol', () => {
    test('detects unresponsive remote', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, {
        heartbeat: { interval: 50, timeout: 150 }
      })
      // Don't wrap port2 — it won't respond to pings
      const closeHandler = vi.fn()
      safe1.on('close', closeHandler)

      // Close port2 raw to simulate crash (no pong response)
      port2.close()

      // Wait for heartbeat timeout
      await new Promise(resolve => setTimeout(resolve, 300))

      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('ping/pong keeps alive', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, {
        heartbeat: { interval: 50, timeout: 300 }
      })
      const safe2 = safeMessagePort(port2, {
        heartbeat: { interval: 50, timeout: 300 }
      })

      const closeHandler = vi.fn()
      safe1.on('close', closeHandler)

      // Wait longer than interval but shorter than timeout
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should NOT have closed (pong is being responded)
      expect(closeHandler).not.toHaveBeenCalled()

      safe1.close()
      safe2.close()
    })

    test('heartbeat stops after close', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, {
        heartbeat: { interval: 50, timeout: 300 }
      })
      safeMessagePort(port2)

      safe1.close()

      // If heartbeat didn't stop, it would throw trying to postMessage on closed port
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    test('goodbye takes priority over heartbeat', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, {
        heartbeat: { interval: 50, timeout: 5000 }
      })
      const safe2 = safeMessagePort(port2)

      const closeHandler = vi.fn()
      safe1.on('close', closeHandler)

      // Goodbye from safe2 should close safe1 immediately (not wait for heartbeat timeout)
      safe2.close()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(closeHandler).toHaveBeenCalledTimes(1)
    })

    test('custom interval and timeout', async () => {
      const { port1, port2 } = createPortPair()
      const safe1 = safeMessagePort(port1, {
        heartbeat: { interval: 30, timeout: 100 }
      })
      // Don't wrap port2 — no pong responses
      const closeHandler = vi.fn()
      safe1.on('close', closeHandler)

      port2.close()

      // Should detect within timeout + interval
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(closeHandler).toHaveBeenCalledTimes(1)
    })
  })
})
