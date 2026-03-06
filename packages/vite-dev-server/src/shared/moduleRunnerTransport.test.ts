import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMessageChannelModuleRunnerTransport,
  normalizeModuleRunnerTransport,
} from './moduleRunnerTransport'

import type { ModuleRunnerTransport } from './moduleRunnerTransport'

describe('createMessageChannelModuleRunnerTransport', () => {
  let mockPort1PostMessage: ReturnType<typeof vi.fn>
  let mockPort1Close: ReturnType<typeof vi.fn>
  let mockPort2: object
  let messageListeners: Set<(event: MessageEvent) => void>

  // Helper to simulate message from remote - dispatches to all registered listeners
  function simulateMessage(data: any) {
    messageListeners.forEach(handler => {
      handler({ data } as MessageEvent)
    })
  }

  // Helper to echo back the vite:mc:init handshake with matching clientId
  function simulateInitEcho(postMessageMock: ReturnType<typeof vi.fn>) {
    const call = postMessageMock.mock.calls.find(
      (c: any[]) => c[0]?.type === 'vite:mc:init'
    )
    const clientId = call?.[0]?.clientId
    simulateMessage({ type: 'vite:mc:init', clientId })
  }

  beforeEach(() => {
    messageListeners = new Set()
    mockPort1PostMessage = vi.fn()
    mockPort1Close = vi.fn()

    // Create a more complete MessagePort mock
    const createMockPort = () => {
      let onmessageHandler: ((event: MessageEvent) => void) | null = null

      return {
        postMessage: mockPort1PostMessage,
        close: mockPort1Close,
        start: vi.fn(),
        addEventListener: vi.fn((type: string, handler: EventListener) => {
          if (type === 'message') {
            messageListeners.add(handler as (event: MessageEvent) => void)
          }
        }),
        removeEventListener: vi.fn((type: string, handler: EventListener) => {
          if (type === 'message') {
            messageListeners.delete(handler as (event: MessageEvent) => void)
          }
        }),
        dispatchEvent: vi.fn((event: Event) => {
          if (event.type === 'message') {
            messageListeners.forEach(h => h(event as MessageEvent))
          }
          return true
        }),
        get onmessage() {
          return onmessageHandler
        },
        set onmessage(handler: ((event: MessageEvent) => void) | null) {
          onmessageHandler = handler
        },
      }
    }

    mockPort2 = {}

    vi.stubGlobal('MessageChannel', class {
      port1 = createMockPort()
      port2 = mockPort2
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  describe('connect()', () => {
    it('creates MessageChannel and transfers port2 via postMessage', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      // Simulate connection confirmation (echo back with matching clientId)
      simulateInitEcho(mockPostMessage)

      await connectPromise

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'vite:mc:init' }),
        [mockPort2]
      )
    })

    it('waits for connect confirmation message and resolves', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 500,
        pingInterval: 0,
      })

      let resolved = false
      const connectPromise = Promise.resolve(transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })).then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)

      // Simulate connection confirmation (echo back with matching clientId)
      simulateInitEcho(mockPostMessage)

      await connectPromise
      expect(resolved).toBe(true)
    })

    it('rejects on timeout', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 50,
        pingInterval: 0,
      })

      await expect(
        transport.connect({
          onMessage: vi.fn(),
          onDisconnection: vi.fn(),
        })
      ).rejects.toThrow('MessageChannel connection timeout')
    })

    it('calls onMessage for received messages after connection', async () => {
      const mockPostMessage = vi.fn()
      const onMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage,
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      // Simulate HMR message
      const hmrPayload = { type: 'update', updates: [] }
      simulateMessage(hmrPayload)

      expect(onMessage).toHaveBeenCalledWith(hmrPayload)
    })

    it('calls onDisconnection on disconnect message', async () => {
      const mockPostMessage = vi.fn()
      const onMessage = vi.fn()
      const onDisconnection = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage,
        onDisconnection,
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      // Simulate disconnect message
      simulateMessage({ type: 'custom', event: 'vite:ws:disconnect', data: {} })

      expect(onDisconnection).toHaveBeenCalled()
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          event: 'vite:ws:disconnect',
        })
      )
    })

    it('emits vite:ws:connect custom event on success', async () => {
      const mockPostMessage = vi.fn()
      const onMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage,
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          event: 'vite:ws:connect',
        })
      )
    })

  })

  describe('disconnect()', () => {
    it('closes the port', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      transport.disconnect()

      expect(mockPort1Close).toHaveBeenCalled()
    })

    it('clears ping interval', async () => {
      vi.useFakeTimers()
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 1000,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      // Advance to trigger ping
      vi.advanceTimersByTime(1000)
      expect(mockPort1PostMessage).toHaveBeenCalledWith({ type: 'ping' }, [])

      transport.disconnect()

      // Reset and advance - no more pings should be sent
      mockPort1PostMessage.mockClear()
      vi.advanceTimersByTime(2000)
      // After disconnect, no more pings should be sent
      expect(mockPort1PostMessage).not.toHaveBeenCalledWith({ type: 'ping' }, [])

      vi.useRealTimers()
    })
  })

  describe('send()', () => {
    it('posts message to the port', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      const payload = { type: 'custom', event: 'test', data: { foo: 'bar' } }
      transport.send(payload as any)

      expect(mockPort1PostMessage).toHaveBeenCalledWith(payload, [])
    })

    it('does nothing if port is undefined (before connect)', () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      // Should not throw
      expect(() => {
        transport.send({ type: 'ping' } as any)
      }).not.toThrow()
    })
  })

  describe('ping', () => {
    it('sends ping messages at specified interval', async () => {
      vi.useFakeTimers()
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 1000,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      mockPort1PostMessage.mockClear()

      vi.advanceTimersByTime(1000)
      expect(mockPort1PostMessage).toHaveBeenCalledWith({ type: 'ping' }, [])

      vi.advanceTimersByTime(1000)
      expect(mockPort1PostMessage).toHaveBeenCalledTimes(2)

      transport.disconnect()
      vi.useRealTimers()
    })

    it('does not send pings if pingInterval is 0', async () => {
      vi.useFakeTimers()
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        timeout: 100,
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateInitEcho(mockPostMessage)
      await connectPromise

      mockPort1PostMessage.mockClear()

      vi.advanceTimersByTime(30000)
      expect(mockPort1PostMessage).not.toHaveBeenCalledWith({ type: 'ping' }, [])

      transport.disconnect()
      vi.useRealTimers()
    })
  })
})

describe('normalizeModuleRunnerTransport', () => {
  describe('connect()', () => {
    it('calls transport.connect with handlers', async () => {
      const mockConnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)
      const onMessage = vi.fn()

      await normalized.connect!(onMessage)

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          onMessage: expect.any(Function),
          onDisconnection: expect.any(Function),
        })
      )
    })

    it('does nothing if already connected', async () => {
      const mockConnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      await normalized.connect!()
      await normalized.connect!()

      expect(mockConnect).toHaveBeenCalledTimes(1)
    })

    it('waits for connecting promise if already connecting', async () => {
      let resolveConnect: () => void
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve
      })
      const mockConnect = vi.fn().mockReturnValue(connectPromise)
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      const promise1 = normalized.connect!()
      const promise2 = normalized.connect!()

      expect(mockConnect).toHaveBeenCalledTimes(1)

      resolveConnect!()
      await promise1
      await promise2

      expect(mockConnect).toHaveBeenCalledTimes(1)
    })

    it('uses empty function if onMessage is not provided', async () => {
      const mockConnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      await normalized.connect!()

      expect(mockConnect).toHaveBeenCalledWith({
        onMessage: expect.any(Function),
        onDisconnection: expect.any(Function),
      })
    })
  })

  describe('disconnect()', () => {
    it('calls transport.disconnect', async () => {
      const mockDisconnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: vi.fn(),
        disconnect: mockDisconnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)
      await normalized.connect!()
      await normalized.disconnect!()

      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('does nothing if not connected', async () => {
      const mockDisconnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: vi.fn(),
        disconnect: mockDisconnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)
      await normalized.disconnect!()

      expect(mockDisconnect).not.toHaveBeenCalled()
    })

    it('does nothing if disconnect is called while connecting (not yet connected)', async () => {
      let resolveConnect: () => void
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve
      })
      const mockConnect = vi.fn().mockReturnValue(connectPromise)
      const mockDisconnect = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        disconnect: mockDisconnect,
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      const connectP = normalized.connect!()
      // disconnect is called before connect completes, so isConnected is still false
      await normalized.disconnect!()

      // disconnect should return early because isConnected is false
      expect(mockDisconnect).not.toHaveBeenCalled()

      resolveConnect!()
      await connectP

      // Now we can disconnect properly
      await normalized.disconnect!()
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('send()', () => {
    it('calls transport.send after connect', async () => {
      const mockSend = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: vi.fn(),
        send: mockSend,
      }

      const normalized = normalizeModuleRunnerTransport(transport)
      await normalized.connect!()

      const payload = { type: 'custom', event: 'test', data: {} } as any
      await normalized.send(payload)

      expect(mockSend).toHaveBeenCalledWith(payload)
    })

    it('throws error if send is called before connect', async () => {
      const transport: ModuleRunnerTransport = {
        connect: vi.fn(),
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      await expect(normalized.send({ type: 'ping' } as any)).rejects.toThrow(
        'send was called before connect'
      )
    })

    it('waits for connecting promise before sending', async () => {
      let resolveConnect: () => void
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve
      })
      const mockConnect = vi.fn().mockReturnValue(connectPromise)
      const mockSend = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: mockSend,
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      normalized.connect!()
      const sendP = normalized.send({ type: 'ping' } as any)

      expect(mockSend).not.toHaveBeenCalled()

      resolveConnect!()
      await sendP

      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe('invoke()', () => {
    it('throws error if invoke is called before connect', async () => {
      const transport: ModuleRunnerTransport = {
        connect: vi.fn(),
        send: vi.fn(),
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      await expect(normalized.invoke('fetchModule', ['/test.js', ''])).rejects.toThrow(
        'invoke was called before connect'
      )
    })

    it('waits for connecting promise before invoking', async () => {
      let resolveConnect: () => void
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve
      })
      const mockConnect = vi.fn().mockReturnValue(connectPromise)
      const mockSend = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: mockSend,
      }

      const normalized = normalizeModuleRunnerTransport(transport)

      normalized.connect!()

      // invoke will wait for connect, but will eventually timeout or fail
      // because there's no response handler set up
      const invokeP = normalized.invoke('fetchModule', ['/test.js', ''])

      expect(mockSend).not.toHaveBeenCalled()

      resolveConnect!()

      // After connect resolves, send should be called with the invoke payload
      await vi.waitFor(() => {
        expect(mockSend).toHaveBeenCalled()
      })

      // Clean up - the invoke will timeout, so we don't await it
    })
  })

  describe('onDisconnection callback', () => {
    it('sets isConnected to false when onDisconnection is called', async () => {
      let onDisconnectionCallback: () => void
      const mockConnect = vi.fn().mockImplementation(({ onDisconnection }) => {
        onDisconnectionCallback = onDisconnection
      })
      const mockSend = vi.fn()
      const transport: ModuleRunnerTransport = {
        connect: mockConnect,
        send: mockSend,
      }

      const normalized = normalizeModuleRunnerTransport(transport)
      await normalized.connect!()

      // Simulate disconnection
      onDisconnectionCallback!()

      // Now send should fail because we're disconnected
      await expect(normalized.send({ type: 'ping' } as any)).rejects.toThrow(
        'send was called before connect'
      )
    })
  })
})
