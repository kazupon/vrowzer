import { describe, it, expect, vi, beforeEach, type Mock } from 'vite-plus/test'
import { createSvcWorkerServer, SvcWorkerServerError } from './index'
import type { SvcWorkerServer, ConnectionEvent } from './index'

// SvcWorker mock interface
interface MockSvcWorker {
  suspended: boolean
  addEventListener: Mock
  removeEventListener: Mock
  __emit: (type: string, event: unknown) => void
  __getListeners: (type: string) => Set<Function>
  // Required because listen() references registration.active
  registration: {
    installing: null
    waiting: null
    active: { scriptURL: string } | null
  }
  location: { href: string }
  // Required because claimOnActivate calls clients.claim()
  clients: {
    claim: Mock
  }
}

// ServiceWorkerGlobalScope mock interface
interface MockServiceWorkerGlobalScope {
  registration: {
    installing: null
    waiting: null
    active: { scriptURL: string } | null
  }
  location: { href: string }
  addEventListener: Mock
  removeEventListener: Mock
  __emit: (type: string, event: unknown) => void
  __getListeners: (type: string) => Set<Function>
}

// Create SvcWorker mock
function createMockSvcWorker(options?: {
  suspended?: boolean
  isActivated?: boolean
}): MockSvcWorker {
  const listeners: Map<string, Set<Function>> = new Map()
  return {
    suspended: options?.suspended ?? false,
    addEventListener: vi.fn((type: string, handler: Function) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)!.add(handler)
    }),
    removeEventListener: vi.fn((type: string, handler: Function) => {
      listeners.get(type)?.delete(handler)
    }),
    __emit: (type: string, event: unknown) => {
      listeners.get(type)?.forEach(fn => fn(event))
    },
    __getListeners: (type: string) => listeners.get(type) || new Set(),
    // Required because listen() casts to ServiceWorkerGlobalScope
    registration: {
      installing: null,
      waiting: null,
      active: options?.isActivated ? { scriptURL: 'https://example.com/sw.js' } : null
    },
    location: { href: 'https://example.com/sw.js' },
    // Required because claimOnActivate calls clients.claim()
    clients: {
      claim: vi.fn(() => Promise.resolve())
    }
  }
}

// Create ServiceWorkerGlobalScope mock (for constructor - all null)
function createMockServiceWorkerGlobalScope(): MockServiceWorkerGlobalScope {
  // Since validServiceWorkerState throws errors for all states,
  // self passed to constructor must have all null values
  const listeners: Map<string, Set<Function>> = new Map()
  return {
    registration: {
      installing: null,
      waiting: null,
      active: null
    },
    location: { href: 'https://example.com/sw.js' },
    addEventListener: vi.fn((type: string, handler: Function) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)!.add(handler)
    }),
    removeEventListener: vi.fn((type: string, handler: Function) => {
      listeners.get(type)?.delete(handler)
    }),
    __emit: (type: string, event: unknown) => {
      listeners.get(type)?.forEach(fn => fn(event))
    },
    __getListeners: (type: string) => listeners.get(type) || new Set()
  }
}

// Mock createSvcWorker
vi.mock('@vrowzer/service-worker/worker', () => ({
  createSvcWorker: vi.fn()
}))

import { createSvcWorker } from '@vrowzer/service-worker/worker'

describe('SvcWorkerServer', () => {
  let mockSelf: MockServiceWorkerGlobalScope
  let mockSvcWorker: MockSvcWorker
  let server: SvcWorkerServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockSelf = createMockServiceWorkerGlobalScope()
    mockSvcWorker = createMockSvcWorker({ isActivated: true })
    ;(createSvcWorker as Mock).mockReturnValue(mockSvcWorker)
  })

  function createServer(options?: {
    isActivated?: boolean
    claimOnActivate?: boolean
  }): SvcWorkerServer {
    // Set SvcWorker's activated state
    mockSvcWorker = createMockSvcWorker({
      isActivated: options?.isActivated ?? true
    })
    ;(createSvcWorker as Mock).mockReturnValue(mockSvcWorker)
    return createSvcWorkerServer(mockSelf as unknown as ServiceWorkerGlobalScope, {
      version: '1.0.0',
      claimOnActivate: options?.claimOnActivate!
    })
  }

  describe('setFetchHandler()', () => {
    describe('basic behavior', () => {
      it('registers fetch handler on svcWorker immediately', () => {
        server = createServer()
        server.setFetchHandler(() => {})
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function))
      })

      it('removes previous handler when called multiple times', () => {
        server = createServer()
        server.setFetchHandler(() => {})
        server.setFetchHandler(() => {})
        expect(mockSvcWorker.removeEventListener).toHaveBeenCalledWith(
          'fetch',
          expect.any(Function)
        )
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledTimes(2)
      })
    })

    describe('error cases', () => {
      it('throws error when handler is not a function', () => {
        server = createServer()
        expect(() => server.setFetchHandler('not a function' as any)).toThrow(SvcWorkerServerError)
      })
    })
  })

  describe('listen()', () => {
    describe('basic behavior', () => {
      it('returns this for chaining', () => {
        server = createServer()
        server.setFetchHandler(() => {})
        const result = server.listen()
        expect(result).toBe(server)
      })

      it('emits listening event when already activated', async () => {
        server = createServer({ isActivated: true })

        const listeningPromise = new Promise<void>(resolve => {
          server.on('listening', resolve)
        })

        server.setFetchHandler(() => {})
        server.listen()
        await listeningPromise
      })

      it('waits for activate event when not activated', async () => {
        server = createServer({ isActivated: false })

        let listeningEmitted = false
        server.on('listening', () => {
          listeningEmitted = true
        })

        server.setFetchHandler(() => {})
        server.listen()

        // listening is not emitted yet
        await new Promise(r => setTimeout(r, 0))
        expect(listeningEmitted).toBe(false)

        // Emit activate event
        mockSvcWorker.__emit('activate', {})
        await new Promise(r => setTimeout(r, 0))
        expect(listeningEmitted).toBe(true)
      })

      it('registers activate handler when not activated', () => {
        server = createServer({ isActivated: false })
        server.setFetchHandler(() => {})
        server.listen()

        // Fetch handler IS registered synchronously in setFetchHandler (required by Service Worker spec)
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function))
        // Activate listener is also registered to wait for activation
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledWith(
          'activate',
          expect.any(Function)
        )
      })

      it('emits listening event after activation', async () => {
        server = createServer({ isActivated: false })
        let listeningEmitted = false
        server.on('listening', () => {
          listeningEmitted = true
        })
        server.setFetchHandler(() => {})
        server.listen()

        // Before activation, listening should not be emitted
        await new Promise(r => setTimeout(r, 0))
        expect(listeningEmitted).toBe(false)

        // Emit activate event
        mockSvcWorker.__emit('activate', {})
        await new Promise(r => setTimeout(r, 0))

        // Now listening event should be emitted
        expect(listeningEmitted).toBe(true)
      })
    })

    describe('error cases', () => {
      it('emits error on double listen', async () => {
        server = createServer({ isActivated: true })

        const errorPromise = new Promise<Error>(resolve => {
          server.on('error', resolve)
        })

        server.setFetchHandler(() => {})
        server.listen()
        server.listen() // double listen

        const error = await errorPromise
        expect(error).toBeInstanceOf(SvcWorkerServerError)
        expect(error.message).toContain('already listening')
      })

      it('emits error when fetch handler is not set', async () => {
        server = createServer({ isActivated: true })

        const errorPromise = new Promise<Error>(resolve => {
          server.on('error', resolve)
        })

        server.listen() // listen without setFetchHandler

        const error = await errorPromise
        expect(error).toBeInstanceOf(SvcWorkerServerError)
        expect(error.message).toContain('Fetch handler not set')
      })

      it('emits error on activate timeout', async () => {
        vi.useFakeTimers()
        server = createServer({ isActivated: false })

        const errorPromise = new Promise<Error>(resolve => {
          server.on('error', resolve)
        })

        // Use short timeout for testing
        server.setFetchHandler(() => {})
        server.listen({ activateTimeout: 100 })

        // Advance time past the timeout
        vi.advanceTimersByTime(100)

        const error = await errorPromise
        expect(error).toBeInstanceOf(SvcWorkerServerError)
        expect(error.message).toContain('Activate timeout')

        vi.useRealTimers()
      })

      it('does not emit timeout error if activated in time', async () => {
        vi.useFakeTimers()
        server = createServer({ isActivated: false })

        let errorEmitted = false
        server.on('error', () => {
          errorEmitted = true
        })

        server.setFetchHandler(() => {})
        server.listen({ activateTimeout: 100 })

        // Activate before timeout
        vi.advanceTimersByTime(50)
        mockSvcWorker.__emit('activate', {})

        // Advance past the original timeout
        vi.advanceTimersByTime(100)

        expect(errorEmitted).toBe(false)

        vi.useRealTimers()
      })
    })
  })

  describe('close()', () => {
    describe('basic behavior', () => {
      it('returns this for chaining', () => {
        server = createServer()
        const result = server.close()
        expect(result).toBe(server)
      })

      it('emits close event', async () => {
        server = createServer()
        server.setFetchHandler(() => {})
        server.listen()

        const closePromise = new Promise<void>(resolve => {
          server.on('close', resolve)
        })

        server.close()
        await closePromise
      })

      it('calls callback', async () => {
        server = createServer()
        server.setFetchHandler(() => {})
        server.listen()

        const callbackPromise = new Promise<void>(resolve => {
          server.close(() => resolve())
        })

        await callbackPromise
      })

      it('removes fetch listener on close', async () => {
        server = createServer()
        server.setFetchHandler(() => {})
        server.listen()
        server.close()

        // Wait for async processing
        await new Promise(r => setTimeout(r, 0))
        expect(mockSvcWorker.removeEventListener).toHaveBeenCalledWith(
          'fetch',
          expect.any(Function)
        )
      })

      it('removes activate listener if waiting', async () => {
        server = createServer({ isActivated: false })
        server.setFetchHandler(() => {})
        server.listen()

        // activate listener should be registered
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledWith(
          'activate',
          expect.any(Function)
        )

        server.close()

        // Wait for async processing
        await new Promise(r => setTimeout(r, 0))
        expect(mockSvcWorker.removeEventListener).toHaveBeenCalledWith(
          'activate',
          expect.any(Function)
        )
      })
    })

    describe('edge cases', () => {
      it('emits close event and calls callback even before listen()', async () => {
        server = createServer()

        let closeEmitted = false
        let callbackCalled = false

        server.on('close', () => {
          closeEmitted = true
        })

        server.close(() => {
          callbackCalled = true
        })

        await new Promise(r => setTimeout(r, 0))
        expect(closeEmitted).toBe(true)
        expect(callbackCalled).toBe(true)
      })

      it('is idempotent - can be called multiple times', async () => {
        server = createServer()
        server.setFetchHandler(() => {})
        server.listen()

        let closeCount = 0
        server.on('close', () => {
          closeCount++
        })

        server.close()
        server.close()

        await new Promise(r => setTimeout(r, 0))
        expect(closeCount).toBe(2)
      })
    })
  })

  describe('listen() -> close() -> listen() cycle', () => {
    it('can listen again after close', async () => {
      server = createServer({ isActivated: true })

      // First listen
      server.setFetchHandler(() => {})
      server.listen()
      await new Promise<void>(resolve => server.close(() => resolve()))

      // Second listen (setFetchHandler already called, but need to set it again after close clears it)
      server.setFetchHandler(() => {})
      const listeningPromise = new Promise<void>(resolve => {
        server.on('listening', resolve)
      })
      server.listen()
      await listeningPromise
    })
  })

  describe('fetch handler behavior', () => {
    it('calls fetch handler on fetch event', () => {
      server = createServer()

      const fetchHandler = vi.fn()
      server.setFetchHandler(fetchHandler)
      server.listen()

      const mockEvent = { request: new Request('https://example.com') }
      mockSvcWorker.__emit('fetch', mockEvent)

      expect(fetchHandler).toHaveBeenCalledWith(mockEvent)
    })

    it('does not call fetch handler when suspended', () => {
      server = createServer()
      // Set suspended state after server creation
      mockSvcWorker.suspended = true

      const fetchHandler = vi.fn()
      server.setFetchHandler(fetchHandler)
      server.listen()

      mockSvcWorker.__emit('fetch', {})

      expect(fetchHandler).not.toHaveBeenCalled()
    })

    it('does not call fetch handler after close', async () => {
      server = createServer()

      const fetchHandler = vi.fn()
      server.setFetchHandler(fetchHandler)
      server.listen()
      await new Promise<void>(resolve => server.close(() => resolve()))

      mockSvcWorker.__emit('fetch', {})

      expect(fetchHandler).not.toHaveBeenCalled()
    })

    it('does not call fetch handler before listen', () => {
      server = createServer()

      const fetchHandler = vi.fn()
      server.setFetchHandler(fetchHandler)
      // Note: listen() is NOT called

      mockSvcWorker.__emit('fetch', {})

      expect(fetchHandler).not.toHaveBeenCalled()
    })

    it('emits error when fetch handler throws', async () => {
      server = createServer()

      const testError = new Error('test error')
      const errorPromise = new Promise<Error>(resolve => {
        server.on('error', resolve)
      })

      server.setFetchHandler(() => {
        throw testError
      })
      server.listen()
      mockSvcWorker.__emit('fetch', {})

      const error = await errorPromise
      expect(error).toBe(testError)
    })
  })

  describe('activate wait + close interaction', () => {
    it('close() during activate wait prevents listening event', async () => {
      server = createServer({ isActivated: false })

      let listeningEmitted = false
      let closeEmitted = false

      server.on('listening', () => {
        listeningEmitted = true
      })
      server.on('close', () => {
        closeEmitted = true
      })

      server.setFetchHandler(() => {})
      server.listen()

      // close before activate
      await new Promise<void>(resolve => server.close(() => resolve()))

      // Even if activate event fires, listening should not fire
      mockSvcWorker.__emit('activate', {})
      await new Promise(r => setTimeout(r, 0))

      expect(listeningEmitted).toBe(false)
      expect(closeEmitted).toBe(true)
    })
  })

  describe('claimOnActivate option', () => {
    it('calls clients.claim() on activate when claimOnActivate is true', async () => {
      server = createServer({ isActivated: false, claimOnActivate: true })

      const listeningPromise = new Promise<void>(resolve => {
        server.on('listening', resolve)
      })

      server.setFetchHandler(() => {})
      server.listen()

      // Create mock event with waitUntil
      const waitUntilPromises: Promise<unknown>[] = []
      const mockEvent = {
        waitUntil: vi.fn((promise: Promise<unknown>) => {
          waitUntilPromises.push(promise)
        })
      }

      // Emit activate event
      mockSvcWorker.__emit('activate', mockEvent)
      await listeningPromise

      // Verify clients.claim() was called via waitUntil
      expect(mockEvent.waitUntil).toHaveBeenCalledTimes(1)
      expect(mockSvcWorker.clients.claim).toHaveBeenCalledTimes(1)
    })

    it('does not call clients.claim() when claimOnActivate is false', async () => {
      server = createServer({ isActivated: false, claimOnActivate: false })

      const listeningPromise = new Promise<void>(resolve => {
        server.on('listening', resolve)
      })

      server.setFetchHandler(() => {})
      server.listen()

      // Create mock event with waitUntil
      const mockEvent = {
        waitUntil: vi.fn()
      }

      // Emit activate event
      mockSvcWorker.__emit('activate', mockEvent)
      await listeningPromise

      // Verify clients.claim() was NOT called
      expect(mockEvent.waitUntil).not.toHaveBeenCalled()
      expect(mockSvcWorker.clients.claim).not.toHaveBeenCalled()
    })

    it('does not call clients.claim() when claimOnActivate is not set', async () => {
      server = createServer({ isActivated: false })

      const listeningPromise = new Promise<void>(resolve => {
        server.on('listening', resolve)
      })

      server.setFetchHandler(() => {})
      server.listen()

      // Create mock event with waitUntil
      const mockEvent = {
        waitUntil: vi.fn()
      }

      // Emit activate event
      mockSvcWorker.__emit('activate', mockEvent)
      await listeningPromise

      // Verify clients.claim() was NOT called
      expect(mockEvent.waitUntil).not.toHaveBeenCalled()
      expect(mockSvcWorker.clients.claim).not.toHaveBeenCalled()
    })
  })

  describe('connection event', () => {
    it('registers message handler on self when listenConnections() is called', () => {
      server = createServer()
      server.listenConnections()

      expect(mockSelf.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('emits connection event when message has ports', async () => {
      server = createServer()

      const connectionPromise = new Promise<ConnectionEvent>(resolve => {
        server.on('connection', resolve)
      })

      server.listenConnections()

      // Create mock MessagePort
      const mockPort = { postMessage: vi.fn() } as unknown as MessagePort

      // Create mock Client source
      const mockClient = { id: 'client-123' } as unknown as Client

      // Create mock ExtendableMessageEvent with ports
      const mockMessageEvent = {
        data: { type: 'test', payload: 'hello' },
        source: mockClient,
        ports: [mockPort]
      } as unknown as ExtendableMessageEvent

      // Emit message event on self
      mockSelf.__emit('message', mockMessageEvent)

      const receivedEvent = await connectionPromise
      expect(receivedEvent.data).toEqual({ type: 'test', payload: 'hello' })
      expect(receivedEvent.ports).toHaveLength(1)
      expect(receivedEvent.ports[0]).toBe(mockPort)
      expect(receivedEvent.source).toBe(mockClient)
      expect(receivedEvent.clientId).toBe('client-123')
    })

    it('does not emit connection event when message has no ports', async () => {
      server = createServer()

      let connectionReceived = false
      server.on('connection', () => {
        connectionReceived = true
      })

      server.listenConnections()

      // Create mock ExtendableMessageEvent without ports
      const mockMessageEvent = {
        data: { type: 'test', payload: 'hello' },
        source: null,
        ports: []
      } as unknown as ExtendableMessageEvent

      // Emit message event on self
      mockSelf.__emit('message', mockMessageEvent)

      await new Promise(r => setTimeout(r, 0))
      expect(connectionReceived).toBe(false)
    })

    it('does not emit connection event when ports is undefined', async () => {
      server = createServer()

      let connectionReceived = false
      server.on('connection', () => {
        connectionReceived = true
      })

      server.listenConnections()

      // Create mock ExtendableMessageEvent with undefined ports
      const mockMessageEvent = {
        data: { type: 'test' },
        source: null,
        ports: undefined
      } as unknown as ExtendableMessageEvent

      // Emit message event on self
      mockSelf.__emit('message', mockMessageEvent)

      await new Promise(r => setTimeout(r, 0))
      expect(connectionReceived).toBe(false)
    })

    it('sets clientId to undefined when source is not a Client', async () => {
      server = createServer()

      const connectionPromise = new Promise<ConnectionEvent>(resolve => {
        server.on('connection', resolve)
      })

      server.listenConnections()

      // Create mock MessagePort
      const mockPort = { postMessage: vi.fn() } as unknown as MessagePort

      // Create mock ExtendableMessageEvent with null source
      const mockMessageEvent = {
        data: { type: 'test' },
        source: null,
        ports: [mockPort]
      } as unknown as ExtendableMessageEvent

      // Emit message event on self
      mockSelf.__emit('message', mockMessageEvent)

      const receivedEvent = await connectionPromise
      expect(receivedEvent.clientId).toBeUndefined()
    })

    it('removes message handler on closeConnections()', async () => {
      server = createServer()
      server.listenConnections()

      await new Promise<void>(resolve => server.closeConnections(() => resolve()))

      expect(mockSelf.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('does not emit connection event after closeConnections()', async () => {
      server = createServer()

      let connectionReceived = false
      server.on('connection', () => {
        connectionReceived = true
      })

      server.listenConnections()
      await new Promise<void>(resolve => server.closeConnections(() => resolve()))

      // Create mock MessagePort
      const mockPort = { postMessage: vi.fn() } as unknown as MessagePort

      // Emit message event after close
      const mockMessageEvent = {
        data: 'test',
        source: null,
        ports: [mockPort]
      } as unknown as ExtendableMessageEvent
      mockSelf.__emit('message', mockMessageEvent)

      await new Promise(r => setTimeout(r, 0))
      expect(connectionReceived).toBe(false)
    })

    it('can receive multiple connection events', async () => {
      server = createServer()

      const connections: ConnectionEvent[] = []
      server.on('connection', event => {
        connections.push(event)
      })

      server.listenConnections()

      // Create mock MessagePort
      const mockPort1 = { postMessage: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn() } as unknown as MessagePort
      const mockPort3 = { postMessage: vi.fn() } as unknown as MessagePort

      // Emit multiple messages with ports
      mockSelf.__emit('message', {
        data: 'first',
        source: null,
        ports: [mockPort1]
      } as unknown as ExtendableMessageEvent)
      mockSelf.__emit('message', {
        data: 'second',
        source: null,
        ports: [mockPort2]
      } as unknown as ExtendableMessageEvent)
      mockSelf.__emit('message', {
        data: 'third',
        source: null,
        ports: [mockPort3]
      } as unknown as ExtendableMessageEvent)

      await new Promise(r => setTimeout(r, 0))

      expect(connections).toHaveLength(3)
      expect(connections[0]!.data).toBe('first')
      expect(connections[1]!.data).toBe('second')
      expect(connections[2]!.data).toBe('third')
    })

    it('emits connection event with multiple ports', async () => {
      server = createServer()

      const connectionPromise = new Promise<ConnectionEvent>(resolve => {
        server.on('connection', resolve)
      })

      server.listenConnections()

      // Create multiple mock MessagePorts
      const mockPort1 = { postMessage: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn() } as unknown as MessagePort

      // Create mock ExtendableMessageEvent with multiple ports
      const mockMessageEvent = {
        data: { type: 'test' },
        source: null,
        ports: [mockPort1, mockPort2]
      } as unknown as ExtendableMessageEvent

      // Emit message event on self
      mockSelf.__emit('message', mockMessageEvent)

      const receivedEvent = await connectionPromise
      expect(receivedEvent.ports).toHaveLength(2)
      expect(receivedEvent.ports[0]).toBe(mockPort1)
      expect(receivedEvent.ports[1]).toBe(mockPort2)
    })
  })

  describe('getConnections()', () => {
    it('returns 0 when no connections', async () => {
      server = createServer()
      server.listenConnections()

      const count = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(count).toBe(0)
    })

    it('returns correct count after connections', async () => {
      server = createServer()
      server.listenConnections()

      // Create mock ports
      const mockPort1 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort

      // Emit connection events
      mockSelf.__emit('message', { data: 'a', source: null, ports: [mockPort1] })
      mockSelf.__emit('message', { data: 'b', source: null, ports: [mockPort2] })

      await new Promise(r => setTimeout(r, 0))

      const count = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(count).toBe(2)
    })

    it('returns this for chaining', () => {
      server = createServer()
      server.listenConnections()

      const result = server.getConnections(() => {})
      expect(result).toBe(server)
    })
  })

  describe('listenConnections()', () => {
    it('returns this for chaining', () => {
      server = createServer()
      const result = server.listenConnections()
      expect(result).toBe(server)
    })

    it('registers message handler on self', () => {
      server = createServer()
      server.listenConnections()
      expect(mockSelf.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('emits connection event when message has ports', async () => {
      server = createServer()
      server.listenConnections()

      const connectionPromise = new Promise<ConnectionEvent>(resolve => {
        server.on('connection', resolve)
      })

      const mockPort = { postMessage: vi.fn() } as unknown as MessagePort
      mockSelf.__emit('message', { data: 'test', source: null, ports: [mockPort] })

      const event = await connectionPromise
      expect(event.ports[0]).toBe(mockPort)
    })

    it('is idempotent - can be called multiple times', () => {
      server = createServer()
      server.listenConnections()
      server.listenConnections()

      // addEventListener should only be called once
      expect(mockSelf.addEventListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('listen() with enableListenConnections', () => {
    it('calls listenConnections when enableListenConnections is true', () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      expect(mockSelf.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('does not register message handler when enableListenConnections is false', () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: false })

      expect(mockSelf.addEventListener).not.toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('does not register message handler by default', () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen()

      expect(mockSelf.addEventListener).not.toHaveBeenCalledWith('message', expect.any(Function))
    })
  })

  describe('closeConnections()', () => {
    it('returns this for chaining', () => {
      server = createServer()
      server.listenConnections()

      const result = server.closeConnections()
      expect(result).toBe(server)
    })

    it('closes all connected ports', async () => {
      server = createServer()
      server.listenConnections()

      const mockPort1 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort

      mockSelf.__emit('message', { data: 'a', source: null, ports: [mockPort1] })
      mockSelf.__emit('message', { data: 'b', source: null, ports: [mockPort2] })

      await new Promise(r => setTimeout(r, 0))

      server.closeConnections()

      expect(mockPort1.close).toHaveBeenCalled()
      expect(mockPort2.close).toHaveBeenCalled()
    })

    it('removes message handler', async () => {
      server = createServer()
      server.listenConnections()

      await new Promise<void>(resolve => server.closeConnections(() => resolve()))

      expect(mockSelf.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('does not emit connection event after closeConnections', async () => {
      server = createServer()
      server.listenConnections()

      let connectionReceived = false
      server.on('connection', () => {
        connectionReceived = true
      })

      await new Promise<void>(resolve => server.closeConnections(() => resolve()))

      const mockPort = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      mockSelf.__emit('message', { data: 'test', source: null, ports: [mockPort] })

      await new Promise(r => setTimeout(r, 0))
      expect(connectionReceived).toBe(false)
    })

    it('calls callback', async () => {
      server = createServer()
      server.listenConnections()

      const cbPromise = new Promise<void>(resolve => {
        server.closeConnections(() => resolve())
      })

      await cbPromise
    })

    it('clears ports count after closeConnections()', async () => {
      server = createServer()
      server.listenConnections()

      const mockPort1 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort

      mockSelf.__emit('message', { data: 'a', source: null, ports: [mockPort1] })
      mockSelf.__emit('message', { data: 'b', source: null, ports: [mockPort2] })

      await new Promise(r => setTimeout(r, 0))

      // Verify count is 2 after closing
      const countBefore = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(countBefore).toBe(2)

      await new Promise<void>(resolve => server.closeConnections(() => resolve()))

      // Verify count is 0 after closing
      const countAfter = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(countAfter).toBe(0)
    })

    it('does nothing when no connections', () => {
      server = createServer()
      server.listenConnections()

      // Should not throw
      expect(() => server.closeConnections()).not.toThrow()
    })
  })

  describe('close() with stopConnectionListening', () => {
    it('calls closeConnections when stopConnectionListening is true', async () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      const mockPort = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      mockSelf.__emit('message', { data: 'test', source: null, ports: [mockPort] })

      await new Promise(r => setTimeout(r, 0))

      await new Promise<void>(resolve => server.close(() => resolve(), true))

      // closeConnections was called - message handler removed and ports closed
      expect(mockSelf.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockPort.close).toHaveBeenCalled()
    })

    it('does not call closeConnections when stopConnectionListening is false', async () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      const mockPort = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      mockSelf.__emit('message', { data: 'test', source: null, ports: [mockPort] })

      await new Promise(r => setTimeout(r, 0))

      await new Promise<void>(resolve => server.close(() => resolve(), false))

      // closeConnections was NOT called - message handler not removed
      expect(mockSelf.removeEventListener).not.toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('does not call closeConnections by default', async () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      await new Promise<void>(resolve => server.close(() => resolve()))

      // closeConnections was NOT called
      expect(mockSelf.removeEventListener).not.toHaveBeenCalledWith('message', expect.any(Function))
    })
  })

  describe('close() with ports and stopConnectionListening=true', () => {
    it('closes all ports on close() with stopConnectionListening=true', async () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      const mockPort = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      mockSelf.__emit('message', { data: 'test', source: null, ports: [mockPort] })

      await new Promise(r => setTimeout(r, 0))

      await new Promise<void>(resolve => server.close(() => resolve(), true))

      expect(mockPort.close).toHaveBeenCalled()
    })

    it('clears ports count after close() with stopConnectionListening=true', async () => {
      server = createServer()
      server.setFetchHandler(() => {})
      server.listen({ enableListenConnections: true })

      const mockPort1 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort
      const mockPort2 = { postMessage: vi.fn(), close: vi.fn() } as unknown as MessagePort

      mockSelf.__emit('message', { data: 'a', source: null, ports: [mockPort1] })
      mockSelf.__emit('message', { data: 'b', source: null, ports: [mockPort2] })

      await new Promise(r => setTimeout(r, 0))

      // Verify ports are registered
      const countBefore = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(countBefore).toBe(2)

      // Close server with stopConnectionListening=true
      await new Promise<void>(resolve => server.close(() => resolve(), true))

      // Verify ports are cleared
      const countAfter = await new Promise<number>(resolve => {
        server.getConnections((_err, count) => resolve(count))
      })
      expect(countAfter).toBe(0)
    })
  })
})
