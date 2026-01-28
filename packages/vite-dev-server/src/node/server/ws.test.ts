import { describe, test, expect, vi, afterEach } from 'vitest'
import { createMessageChannelServer, isMessageChannelServer } from './ws'
import type { ResolvedConfig } from '../config'
import type { ConnectionEvent } from '@vrowser/service-worker-server'

// --- Mock safeMessagePort ---

type MessageListener = (event: MessageEvent) => void
type ErrorListener = (event: MessageEvent) => void

// Store for accessing mock internals
const mockSafePortMap = new WeakMap<MessagePort, ReturnType<typeof createMockSafePort>>()

function createMockSafePort(rawPort: MessagePort) {
  const messageListeners: Set<MessageListener> = new Set()
  const errorListeners: Set<ErrorListener> = new Set()

  const safePort = {
    port: rawPort,
    postMessage: vi.fn(),
    close: vi.fn(),
    start: vi.fn(),
    on: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message') messageListeners.add(handler as MessageListener)
      if (type === 'messageerror') errorListeners.add(handler as ErrorListener)
    }),
    off: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message') messageListeners.delete(handler as MessageListener)
      if (type === 'messageerror') errorListeners.delete(handler as ErrorListener)
    }),
    once: vi.fn(),
    emit: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onmessageerror: null as ((ev: MessageEvent) => void) | null,
    dispose: vi.fn(),
    [Symbol.dispose]: vi.fn(),
    // Helpers for testing
    simulateMessage: (data: unknown) => {
      messageListeners.forEach(h => h({ data } as MessageEvent))
    },
    simulateError: (err: unknown) => {
      errorListeners.forEach(h => h(err as MessageEvent))
    }
  }

  mockSafePortMap.set(rawPort, safePort)
  return safePort
}

// Mock the safeMessagePort module
vi.mock('@kazupon/jts-utils/message/port', () => ({
  safeMessagePort: (port: MessagePort) => createMockSafePort(port)
}))

// --- Mock Factories ---

type ConnectionHandler = (event: ConnectionEvent<unknown>) => void

function createMockHttpServer() {
  const connectionHandlers: Set<ConnectionHandler> = new Set()

  return {
    on: vi.fn((event: string, handler: ConnectionHandler) => {
      if (event === 'connection') {
        connectionHandlers.add(handler)
      }
    }),
    off: vi.fn((event: string, handler: ConnectionHandler) => {
      if (event === 'connection') {
        connectionHandlers.delete(handler)
      }
    }),
    listenConnections: vi.fn(),
    closeConnections: vi.fn((cb?: () => void) => cb?.()),
    // Helper to simulate connection events
    simulateConnection: (event: ConnectionEvent<unknown>) => {
      connectionHandlers.forEach(h => h(event))
    },
    _getHandlerCount: () => connectionHandlers.size
  }
}

function createMockMessagePort() {
  // Create a minimal mock that will be wrapped by safeMessagePort
  const port = {
    postMessage: vi.fn(),
    close: vi.fn(),
    start: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onmessageerror: null as ((ev: MessageEvent) => void) | null,
  } as unknown as MessagePort

  return port
}

// Helper to get the mock safe port for a raw port
function getMockSafePort(rawPort: MessagePort) {
  return mockSafePortMap.get(rawPort)!
}

function createMockConfig(options: { wsEnabled?: boolean } = {}) {
  return {
    server: options.wsEnabled === false ? { ws: false } : {}
  } as ResolvedConfig
}

// --- Tests ---

describe('createMessageChannelServer', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('with ws disabled (noop server)', () => {
    test('returns noop server when config.server.ws is false', () => {
      const server = createMockHttpServer()
      const config = createMockConfig({ wsEnabled: false })

      const ws = createMessageChannelServer(server as any, config)

      expect(ws[isMessageChannelServer]).toBe(true)
      expect(ws.clients.size).toBe(0)

      // noop functions should not throw
      ws.send({ type: 'connected' })
      ws.listen()
      ws.on('connection', vi.fn())
      ws.off('connection', vi.fn())
    })

    test('close() resolves immediately for noop server', async () => {
      const server = createMockHttpServer()
      const config = createMockConfig({ wsEnabled: false })
      const ws = createMessageChannelServer(server as any, config)

      await expect(ws.close()).resolves.toBeUndefined()
    })
  })

  describe('connection handling', () => {
    test('ignores connection events without vite:mc:init type', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'other' },
        ports: [port],
        source: null
      })

      // safeMessagePort should not be created for non-init events
      expect(ws.clients.size).toBe(0)
    })

    test('ignores connection events without ports', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [],
        source: null
      })

      expect(ws.clients.size).toBe(0)
    })

    test('handles valid vite:mc:init connection', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null,
        clientId: 'test-client-1'
      })

      const safePort = getMockSafePort(port)
      expect(safePort.postMessage).toHaveBeenCalledWith({ type: 'vite:mc:init' })
      expect(safePort.postMessage).toHaveBeenCalledWith({ type: 'connected' })
      expect(ws.clients.size).toBe(1)
    })

    test('emits connection event when client connects', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const connectionHandler = vi.fn()

      ws.on('connection', connectionHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      expect(connectionHandler).toHaveBeenCalledWith(port)
    })
  })

  describe('send', () => {
    test('broadcasts payload to all connected clients', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port1 = createMockMessagePort()
      const port2 = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      // Connect 2 clients
      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port1],
        source: null
      })
      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port2],
        source: null
      })

      const payload = { type: 'update' as const, updates: [] }
      ws.send(payload)

      expect(getMockSafePort(port1).postMessage).toHaveBeenCalledWith(payload)
      expect(getMockSafePort(port2).postMessage).toHaveBeenCalledWith(payload)
    })

    test('buffers error payload when no clients connected', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      const errorPayload = {
        type: 'error' as const,
        err: { message: 'test', stack: '', plugin: '', id: '', loc: undefined }
      }
      ws.send(errorPayload)

      // Connect client - buffered message should be sent
      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith(errorPayload)
    })

    test('buffers full-reload payload when no clients connected', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      const reloadPayload = { type: 'full-reload' as const, path: '/test.js' }
      ws.send(reloadPayload)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith(reloadPayload)
    })
  })

  describe('custom event handling', () => {
    test('registers and triggers custom event listeners', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const customHandler = vi.fn()

      ws.on('my-custom-event', customHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      getMockSafePort(port).simulateMessage({
        type: 'custom',
        event: 'my-custom-event',
        data: { foo: 'bar' }
      })

      expect(customHandler).toHaveBeenCalledWith(
        { foo: 'bar' },
        expect.objectContaining({ port })
      )
    })

    test('unregisters custom event listeners with off()', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const customHandler = vi.fn()

      ws.on('my-event', customHandler)
      ws.off('my-event', customHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })
      getMockSafePort(port).simulateMessage({ type: 'custom', event: 'my-event', data: {} })

      expect(customHandler).not.toHaveBeenCalled()
    })

    test('ignores ping messages', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const customHandler = vi.fn()

      ws.on('ping', customHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })
      getMockSafePort(port).simulateMessage({ type: 'ping' })

      expect(customHandler).not.toHaveBeenCalled()
    })
  })

  describe('close', () => {
    test('sends disconnect event to all clients', async () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      await ws.close()

      const safePort = getMockSafePort(port)
      expect(safePort.postMessage).toHaveBeenCalledWith({
        type: 'custom',
        event: 'vite:ws:disconnect',
        data: {}
      })
      expect(safePort.close).toHaveBeenCalled()
    })

    test('clears all clients after close', async () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })
      expect(ws.clients.size).toBe(1)

      await ws.close()

      expect(ws.clients.size).toBe(0)
    })

    test('emits close event', async () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const ws = createMessageChannelServer(server as any, config)
      const closeHandler = vi.fn()

      ws.on('close', closeHandler)
      await ws.close()

      expect(closeHandler).toHaveBeenCalled()
    })

    test('removes connection handler from server', async () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const ws = createMessageChannelServer(server as any, config)

      await ws.close()

      expect(server.off).toHaveBeenCalledWith('connection', expect.any(Function))
    })
  })

  describe('listen', () => {
    test('calls server.listenConnections()', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const ws = createMessageChannelServer(server as any, config)

      ws.listen()

      expect(server.listenConnections).toHaveBeenCalled()
    })
  })

  describe('clients', () => {
    test('returns Set of MessageChannelClient objects', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      const clients = ws.clients
      expect(clients.size).toBe(1)

      const client = Array.from(clients)[0]
      expect(client.port).toBe(port)
    })

    test('clientId is set when vite:client:connect listener is registered', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const connectHandler = vi.fn()

      // Register vite:client:connect listener before connection
      ws.on('vite:client:connect', connectHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null,
        clientId: 'client-123'
      })

      // Handler should be called with client that has clientId
      expect(connectHandler).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          port,
          clientId: 'client-123'
        })
      )
    })

    test('client.send() posts message to port', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      const client = Array.from(ws.clients)[0]
      client.send({ type: 'connected' })

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith({ type: 'connected' })
    })

    test('client.send() with string event creates custom payload', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      const client = Array.from(ws.clients)[0]
      client.send('my-event', { data: 'test' })

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith({
        type: 'custom',
        event: 'my-event',
        data: { data: 'test' }
      })
    })
  })

  describe('error handling', () => {
    test('emits error event on messageerror', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(server as any, config)
      const errorHandler = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      ws.on('error', errorHandler)

      server.simulateConnection({
        data: { type: 'vite:mc:init' },
        ports: [port],
        source: null
      })

      const mockError = new Error('test error')
      getMockSafePort(port).simulateError(mockError)

      expect(errorHandler).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('isMessageChannelServer symbol', () => {
    test('server has isMessageChannelServer symbol set to true', () => {
      const server = createMockHttpServer()
      const config = createMockConfig()
      const ws = createMessageChannelServer(server as any, config)

      expect(ws[isMessageChannelServer]).toBe(true)
    })
  })
})
