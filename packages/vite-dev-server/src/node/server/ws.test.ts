import { describe, test, expect, vi, afterEach } from 'vitest'
import { createMessageChannelServer, isMessageChannelServer } from './ws'
import type { ResolvedConfig } from '../config'

// --- Mock safeMessagePort ---

type MessageListener = (event: MessageEvent) => void
type ErrorListener = (event: MessageEvent) => void

// Store for accessing mock internals
const mockSafePortMap = new WeakMap<MessagePort, ReturnType<typeof createMockSafePort>>()

function createMockSafePort(rawPort: MessagePort) {
  const messageListeners: Set<MessageListener> = new Set()
  const errorListeners: Set<ErrorListener> = new Set()

  const safePort = {
    raw: rawPort,
    postMessage: vi.fn(),
    close: vi.fn(),
    start: vi.fn(),
    on: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message') {messageListeners.add(handler as MessageListener)}
      if (type === 'messageerror') {errorListeners.add(handler as ErrorListener)}
    }),
    off: vi.fn((type: string, handler: EventListener) => {
      if (type === 'message') {messageListeners.delete(handler as MessageListener)}
      if (type === 'messageerror') {errorListeners.delete(handler as ErrorListener)}
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

function createMockMessagePort() {
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

// Helper: add port to server, call listen, so port is activated
function connectClient(ws: ReturnType<typeof createMessageChannelServer>, port: MessagePort, clientId?: string) {
  ws.handlePort(port, clientId)
  ws.listen()
}

// --- Tests ---

describe('createMessageChannelServer', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('with ws disabled (noop server)', () => {
    test('returns noop server when config.server.ws is false', () => {
      const config = createMockConfig({ wsEnabled: false })

      const ws = createMessageChannelServer(config)

      expect(ws[isMessageChannelServer]).toBe(true)
      expect(ws.clients.size).toBe(0)

      // noop functions should not throw
      ws.send({ type: 'connected' })
      ws.listen()
      ws.on('connection', vi.fn())
      ws.off('connection', vi.fn())
    })

    test('close() resolves immediately for noop server', async () => {
      const config = createMockConfig({ wsEnabled: false })
      const ws = createMessageChannelServer(config)

      await expect(ws.close()).resolves.toBeUndefined()
    })
  })

  describe('connection handling', () => {
    test('handles valid port connection after listen', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port, 'test-client-1')

      const safePort = getMockSafePort(port)
      expect(safePort.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'vite:mc:init' }))
      expect(safePort.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'connected' }))
      expect(ws.clients.size).toBe(1)
    })

    test('emits connection event when client connects', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const connectionHandler = vi.fn()

      ws.on('connection', connectionHandler)

      connectClient(ws, port)

      expect(connectionHandler).toHaveBeenCalledWith(port)
    })
  })

  describe('send', () => {
    test('broadcasts payload to all connected clients', () => {
      const config = createMockConfig()
      const port1 = createMockMessagePort()
      const port2 = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      // Connect 2 clients
      ws.handlePort(port1)
      ws.handlePort(port2)
      ws.listen()

      const payload = { type: 'update' as const, updates: [] }
      ws.send(payload)

      expect(getMockSafePort(port1).postMessage).toHaveBeenCalledWith(payload)
      expect(getMockSafePort(port2).postMessage).toHaveBeenCalledWith(payload)
    })

    test('buffers error payload when no clients connected', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      const errorPayload = {
        type: 'error' as const,
        err: { message: 'test', stack: '', plugin: '', id: '', loc: undefined }
      }
      ws.send(errorPayload)

      // Connect client - buffered message should be sent
      connectClient(ws, port)

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith(errorPayload)
    })

    test('buffers full-reload payload when no clients connected', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      const reloadPayload = { type: 'full-reload' as const, path: '/test.js' }
      ws.send(reloadPayload)

      connectClient(ws, port)

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith(reloadPayload)
    })
  })

  describe('custom event handling', () => {
    test('registers and triggers custom event listeners', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const customHandler = vi.fn()

      ws.on('my-custom-event', customHandler)

      connectClient(ws, port)

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
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const customHandler = vi.fn()

      ws.on('my-event', customHandler)
      ws.off('my-event', customHandler)

      connectClient(ws, port)
      getMockSafePort(port).simulateMessage({ type: 'custom', event: 'my-event', data: {} })

      expect(customHandler).not.toHaveBeenCalled()
    })

    test('ignores ping messages', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const customHandler = vi.fn()

      ws.on('ping', customHandler)

      connectClient(ws, port)
      getMockSafePort(port).simulateMessage({ type: 'ping' })

      expect(customHandler).not.toHaveBeenCalled()
    })
  })

  describe('close', () => {
    test('sends disconnect event to all clients', async () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port)

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
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port)
      expect(ws.clients.size).toBe(1)

      await ws.close()

      expect(ws.clients.size).toBe(0)
    })

    test('emits close event', async () => {
      const config = createMockConfig()
      const ws = createMessageChannelServer(config)
      const closeHandler = vi.fn()

      ws.on('close', closeHandler)
      await ws.close()

      expect(closeHandler).toHaveBeenCalled()
    })
  })

  describe('listen', () => {
    test('activates pending ports on listen', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const connectionHandler = vi.fn()

      ws.on('connection', connectionHandler)

      // handlePort adds port to safePorts (tracked immediately)
      ws.handlePort(port)
      expect(ws.clients.size).toBe(1)

      // But connection event (activation) fires only after listen()
      expect(connectionHandler).not.toHaveBeenCalled()
      ws.listen()
      expect(connectionHandler).toHaveBeenCalledWith(port)
    })
  })

  describe('clients', () => {
    test('returns Set of MessageChannelClient objects', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port)

      const clients = ws.clients
      expect(clients.size).toBe(1)

      const client = Array.from(clients)[0]
      expect(client.port).toBe(port)
    })

    test('clientId is set when provided to handlePort', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const connectHandler = vi.fn()

      ws.on('vite:client:connect', connectHandler)

      // listen first, then handlePort — activation is immediate and clientId is preserved
      ws.listen()
      ws.handlePort(port, 'client-123')

      expect(connectHandler).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          port,
          clientId: 'client-123'
        })
      )
    })

    test('client.send() posts message to port', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port)

      const client = Array.from(ws.clients)[0]
      client.send({ type: 'connected' })

      expect(getMockSafePort(port).postMessage).toHaveBeenCalledWith({ type: 'connected' })
    })

    test('client.send() with string event creates custom payload', () => {
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)

      connectClient(ws, port)

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
      const config = createMockConfig()
      const port = createMockMessagePort()
      const ws = createMessageChannelServer(config)
      const errorHandler = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      ws.on('error', errorHandler)

      connectClient(ws, port)

      const mockError = new Error('test error')
      getMockSafePort(port).simulateError(mockError)

      expect(errorHandler).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('isMessageChannelServer symbol', () => {
    test('server has isMessageChannelServer symbol set to true', () => {
      const config = createMockConfig()
      const ws = createMessageChannelServer(config)

      expect(ws[isMessageChannelServer]).toBe(true)
    })
  })
})
