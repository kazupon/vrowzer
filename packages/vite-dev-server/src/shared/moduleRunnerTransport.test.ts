import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMessageChannelModuleRunnerTransport } from './moduleRunnerTransport'

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

      // Simulate connection confirmation
      simulateMessage({ type: 'vite:mc:init' })

      await connectPromise

      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: 'vite:mc:init' },
        '*',
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

      // Simulate connection confirmation
      simulateMessage({ type: 'vite:mc:init' })

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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
      await connectPromise

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          event: 'vite:ws:connect',
        })
      )
    })

    it('uses custom targetOrigin when provided', async () => {
      const mockPostMessage = vi.fn()
      const transport = createMessageChannelModuleRunnerTransport(mockPostMessage, {
        
        timeout: 100,
        targetOrigin: 'https://example.com',
        pingInterval: 0,
      })

      const connectPromise = transport.connect({
        onMessage: vi.fn(),
        onDisconnection: vi.fn(),
      })

      simulateMessage({ type: 'vite:mc:init' })
      await connectPromise

      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: 'vite:mc:init' },
        'https://example.com',
        [mockPort2]
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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
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

      simulateMessage({ type: 'vite:mc:init' })
      await connectPromise

      mockPort1PostMessage.mockClear()

      vi.advanceTimersByTime(30000)
      expect(mockPort1PostMessage).not.toHaveBeenCalledWith({ type: 'ping' }, [])

      transport.disconnect()
      vi.useRealTimers()
    })
  })
})
