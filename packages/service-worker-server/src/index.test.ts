import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { SvcWorkerServer, SvcWorkerServerError } from './index'

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
      if (!listeners.has(type)) listeners.set(type, new Set())
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
  return {
    registration: {
      installing: null,
      waiting: null,
      active: null
    },
    location: { href: 'https://example.com/sw.js' }
  }
}

// Mock createSvcWorker
vi.mock('@vrowser/service-worker/worker', () => ({
  createSvcWorker: vi.fn()
}))

import { createSvcWorker } from '@vrowser/service-worker/worker'

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
    return new SvcWorkerServer(mockSelf as unknown as ServiceWorkerGlobalScope, {
      version: '1.0.0',
      claimOnActivate: options?.claimOnActivate!
    })
  }

  describe('listen()', () => {
    describe('basic behavior', () => {
      it('returns this for chaining', () => {
        server = createServer()
        const result = server.listen(() => {})
        expect(result).toBe(server)
      })

      it('registers fetch handler on svcWorker', () => {
        server = createServer()
        server.listen(() => {})
        expect(mockSvcWorker.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function))
      })

      it('emits listening event when already activated', async () => {
        server = createServer({ isActivated: true })

        const listeningPromise = new Promise<void>(resolve => {
          server.on('listening', resolve)
        })

        server.listen(() => {})
        await listeningPromise
      })

      it('waits for activate event when not activated', async () => {
        server = createServer({ isActivated: false })

        let listeningEmitted = false
        server.on('listening', () => {
          listeningEmitted = true
        })

        server.listen(() => {})

        // listening is not emitted yet
        await new Promise(r => setTimeout(r, 0))
        expect(listeningEmitted).toBe(false)

        // Emit activate event
        mockSvcWorker.__emit('activate', {})
        await new Promise(r => setTimeout(r, 0))
        expect(listeningEmitted).toBe(true)
      })

      it('registers fetch handler synchronously but also registers activate handler', () => {
        server = createServer({ isActivated: false })
        server.listen(() => {})

        // Fetch handler IS registered synchronously (required by Service Worker spec)
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
        server.listen(() => {})

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

        server.listen(() => {})
        server.listen(() => {}) // double listen

        const error = await errorPromise
        expect(error).toBeInstanceOf(SvcWorkerServerError)
        expect(error.message).toContain('already listening')
      })

      it('emits error when fetch is not a function', async () => {
        server = createServer({ isActivated: true })

        const errorPromise = new Promise<Error>(resolve => {
          server.on('error', resolve)
        })

        server.listen('not a function' as any)

        const error = await errorPromise
        expect(error).toBeInstanceOf(SvcWorkerServerError)
        expect(error.message).toContain('must be a function')
      })

      it('emits error on activate timeout', async () => {
        vi.useFakeTimers()
        server = createServer({ isActivated: false })

        const errorPromise = new Promise<Error>(resolve => {
          server.on('error', resolve)
        })

        // Use short timeout for testing
        server.listen(() => {}, { activateTimeout: 100 })

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

        server.listen(() => {}, { activateTimeout: 100 })

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
        server.listen(() => {})

        const closePromise = new Promise<void>(resolve => {
          server.on('close', resolve)
        })

        server.close()
        await closePromise
      })

      it('calls callback', async () => {
        server = createServer()
        server.listen(() => {})

        const callbackPromise = new Promise<void>(resolve => {
          server.close(() => resolve())
        })

        await callbackPromise
      })

      it('removes fetch listener on close', async () => {
        server = createServer()
        server.listen(() => {})
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
        server.listen(() => {})

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
        server.listen(() => {})

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
      server.listen(() => {})
      await new Promise<void>(resolve => server.close(() => resolve()))

      // Second listen
      const listeningPromise = new Promise<void>(resolve => {
        server.on('listening', resolve)
      })
      server.listen(() => {})
      await listeningPromise
    })
  })

  describe('fetch handler behavior', () => {
    it('calls fetch handler on fetch event', () => {
      server = createServer()

      const fetchHandler = vi.fn()
      server.listen(fetchHandler)

      const mockEvent = { request: new Request('https://example.com') }
      mockSvcWorker.__emit('fetch', mockEvent)

      expect(fetchHandler).toHaveBeenCalledWith(mockEvent)
    })

    it('does not call fetch handler when suspended', () => {
      server = createServer()
      // Set suspended state after server creation
      mockSvcWorker.suspended = true

      const fetchHandler = vi.fn()
      server.listen(fetchHandler)

      mockSvcWorker.__emit('fetch', {})

      expect(fetchHandler).not.toHaveBeenCalled()
    })

    it('does not call fetch handler after close', async () => {
      server = createServer()

      const fetchHandler = vi.fn()
      server.listen(fetchHandler)
      await new Promise<void>(resolve => server.close(() => resolve()))

      mockSvcWorker.__emit('fetch', {})

      expect(fetchHandler).not.toHaveBeenCalled()
    })

    it('emits error when fetch handler throws', async () => {
      server = createServer()

      const testError = new Error('test error')
      const errorPromise = new Promise<Error>(resolve => {
        server.on('error', resolve)
      })

      server.listen(() => {
        throw testError
      })
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

      server.listen(() => {})

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

      server.listen(() => {})

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

      server.listen(() => {})

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

      server.listen(() => {})

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
})
