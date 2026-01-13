import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  V_SW_SESSION_PONG,
  V_SW_SESSION_CLOSE,
  V_SW_SESSION_INIT,
  V_SW_SESSION_CIRCUIT_BREAKER,
  V_SW_SESSION_RESUME,
  V_SW_SKIP_WAITING,
  V_SW_VERSION
} from './protocols.ts'
import { createSvcWorker } from './worker.ts'

// Helper to create a mock ServiceWorkerGlobalScope
function createMockSelf() {
  const listeners = new Map<string, Set<EventListener>>()

  return {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)!.add(listener)
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    }),
    skipWaiting: vi.fn(() => Promise.resolve()),
    // Helper to dispatch events for testing
    _dispatchEvent: (type: string, event: unknown) => {
      listeners.get(type)?.forEach(listener => listener(event as Event))
    },
    _getListeners: (type: string) => listeners.get(type) ?? new Set(),
    // Native properties for Proxy transparency test
    registration: { scope: '/test/' },
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn(() => Promise.resolve([]))
    }
  } as unknown as ServiceWorkerGlobalScope & {
    _dispatchEvent: (type: string, event: unknown) => void
    _getListeners: (type: string) => Set<EventListener>
  }
}

describe('createSvcWorker', () => {
  let mockSelf: ReturnType<typeof createMockSelf>

  beforeEach(() => {
    mockSelf = createMockSelf()
  })

  describe('version property', () => {
    test('should expose version from options', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1.0.0' })
      expect(self.version).toBe('v1.0.0')
    })

    test('should be readonly', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      expect(() => {
        // @ts-expect-error - testing readonly
        self.version = 'v2'
      }).toThrow()
    })
  })

  describe('Proxy transparency', () => {
    test('should access native properties through proxy', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })

      // Access native property
      expect(self.registration).toBe(mockSelf.registration)
      expect(self.clients).toBe(mockSelf.clients)
    })

    test('should call native methods through proxy', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })

      self.addEventListener('fetch', () => {})

      // eslint-disable-next-line @typescript-eslint/unbound-method --- Intentional
      expect(mockSelf.addEventListener).toHaveBeenCalledWith('fetch', expect.any(Function))
    })

    test('should support "in" operator for extension properties', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })

      expect('version' in self).toBe(true)
      expect('dispose' in self).toBe(true)
      expect('registration' in self).toBe(true)
    })
  })

  describe('V_SW_VERSION message', () => {
    test('should respond with version via MessagePort', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1.2.3' })
      void self // ensure self is created

      const mockPort = { postMessage: vi.fn() }
      const messageEvent = {
        data: { type: V_SW_VERSION },
        ports: [mockPort]
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(mockPort.postMessage).toHaveBeenCalledWith(
        {
          type: V_SW_VERSION,
          version: 'v1.2.3'
        },
        undefined
      )
    })

    test('should not respond if no port provided', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { type: V_SW_VERSION },
        ports: []
      }

      // Should not throw
      expect(() => mockSelf._dispatchEvent('message', messageEvent)).not.toThrow()
    })
  })

  describe('V_SW_SKIP_WAITING message', () => {
    test('should call skipWaiting on message', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { type: V_SW_SKIP_WAITING },
        ports: []
      }

      mockSelf._dispatchEvent('message', messageEvent)

      // eslint-disable-next-line @typescript-eslint/unbound-method --- Intentional
      expect(mockSelf.skipWaiting).toHaveBeenCalled()
    })
  })

  describe('message handling edge cases', () => {
    test('should ignore messages without type', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { foo: 'bar' },
        ports: []
      }

      expect(() => mockSelf._dispatchEvent('message', messageEvent)).not.toThrow()
    })

    test('should ignore null data', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: null,
        ports: []
      }

      expect(() => mockSelf._dispatchEvent('message', messageEvent)).not.toThrow()
    })

    test('should warn on unknown message type', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const messageEvent = {
        data: { type: 'UNKNOWN_TYPE' },
        ports: []
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(warnSpy).toHaveBeenCalledWith(
        'createSvcWorker: unknown message type received:',
        expect.objectContaining({ type: 'UNKNOWN_TYPE' })
      )

      warnSpy.mockRestore()
    })
  })

  describe('dispose', () => {
    test('should remove message listener on dispose', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })

      // Before dispose, message listener should exist
      expect(mockSelf._getListeners('message').size).toBe(1)

      self.dispose()

      // After dispose, message listener should be removed
      expect(mockSelf._getListeners('message').size).toBe(0)
    })

    test('should not respond to messages after dispose', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      self.dispose()

      const mockPort = { postMessage: vi.fn() }
      const messageEvent = {
        data: { type: V_SW_VERSION },
        ports: [mockPort]
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(mockPort.postMessage).not.toHaveBeenCalled()
    })

    test('should be dispose by `using`', () => {
      // Before creating, no message listener
      expect(mockSelf._getListeners('message').size).toBe(0)

      // `using` block - dispose should be called at end of block
      {
        using _self = createSvcWorker(mockSelf, { version: 'v1' })
        // Inside block, message listener should exist
        expect(mockSelf._getListeners('message').size).toBe(1)
      }

      // After block ends, dispose should have been called, removing listener
      expect(mockSelf._getListeners('message').size).toBe(0)
    })
  })

  describe('debug option', () => {
    test('should call debug function when provided', () => {
      const debug = vi.fn()
      const sw = createSvcWorker(mockSelf, { version: 'v1', debug })
      void sw

      expect(debug).toHaveBeenCalledWith('createSvcWorker: initializing with version', 'v1')
    })

    test('should log message events when debug is provided', () => {
      const debug = vi.fn()
      const self = createSvcWorker(mockSelf, { version: 'v1', debug })
      void self

      const mockPort = { postMessage: vi.fn() }
      const messageEvent = {
        data: { type: V_SW_VERSION },
        ports: [mockPort]
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(debug).toHaveBeenCalledWith('createSvcWorker: received message', V_SW_VERSION)
      expect(debug).toHaveBeenCalledWith('createSvcWorker: responding with version', 'v1')
    })
  })

  describe('session management', () => {
    // Helper to create a mock MessagePort
    function createMockPort() {
      const portListeners = new Map<string, Set<EventListener>>()
      return {
        postMessage: vi.fn(),
        close: vi.fn(),
        start: vi.fn(),
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          if (!portListeners.has(type)) {
            portListeners.set(type, new Set())
          }
          portListeners.get(type)!.add(listener)
        }),
        removeEventListener: vi.fn((type: string, listener: EventListener) => {
          portListeners.get(type)?.delete(listener)
        }),
        _dispatchEvent: (type: string, event: unknown) => {
          portListeners.get(type)?.forEach(listener => listener(event as Event))
        }
      }
    }

    test('should expose sessionCount property', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      expect(self.sessionCount).toBe(0)
    })

    test('should handle SESSION_INIT and establish session', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const mockPort = createMockPort()
      const messageEvent = {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort],
        source: { id: 'client-123' }
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(mockPort.start).toHaveBeenCalled()
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        {
          type: V_SW_SESSION_INIT,
          success: true,
          version: 'v1'
        },
        undefined
      )
      expect(self.sessionCount).toBe(1)
    })

    test('should ignore SESSION_INIT without port', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { type: V_SW_SESSION_INIT },
        ports: [],
        source: { id: 'client-123' }
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(self.sessionCount).toBe(0)
    })

    test('should ignore SESSION_INIT without clientId', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const mockPort = createMockPort()
      const messageEvent = {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort],
        source: null
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(self.sessionCount).toBe(0)
    })

    test('should handle SESSION_CLOSE and remove session', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const mockPort = createMockPort()
      const messageEvent = {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort],
        source: { id: 'client-123' }
      }

      mockSelf._dispatchEvent('message', messageEvent)
      expect(self.sessionCount).toBe(1)

      // Simulate SESSION_CLOSE from the session port
      mockPort._dispatchEvent('message', {
        data: { type: V_SW_SESSION_CLOSE }
      })

      expect(mockPort.close).toHaveBeenCalled()
      expect(self.sessionCount).toBe(0)
    })

    test('should handle PONG and update lastPong', () => {
      const debug = vi.fn()
      const self = createSvcWorker(mockSelf, { version: 'v1', debug })
      void self

      const mockPort = createMockPort()
      const messageEvent = {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort],
        source: { id: 'client-123' }
      }

      mockSelf._dispatchEvent('message', messageEvent)

      // Simulate PONG from the session port
      mockPort._dispatchEvent('message', {
        data: { type: V_SW_SESSION_PONG, id: 'ping-1' }
      })

      expect(debug).toHaveBeenCalledWith('createSvcWorker: PONG received from', 'client-123')
    })

    test('should replace existing session for same client', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const mockPort1 = createMockPort()
      const mockPort2 = createMockPort()

      // First session
      mockSelf._dispatchEvent('message', {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort1],
        source: { id: 'client-123' }
      })
      expect(self.sessionCount).toBe(1)

      // Second session for same client
      mockSelf._dispatchEvent('message', {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort2],
        source: { id: 'client-123' }
      })

      expect(mockPort1.close).toHaveBeenCalled()
      expect(self.sessionCount).toBe(1)
    })

    test('should close all sessions on dispose', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const mockPort1 = createMockPort()
      const mockPort2 = createMockPort()

      mockSelf._dispatchEvent('message', {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort1],
        source: { id: 'client-1' }
      })
      mockSelf._dispatchEvent('message', {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort2],
        source: { id: 'client-2' }
      })

      expect(self.sessionCount).toBe(2)

      self.dispose()

      expect(mockPort1.close).toHaveBeenCalled()
      expect(mockPort2.close).toHaveBeenCalled()
      expect(self.sessionCount).toBe(0)
    })
  })

  describe('suspended property', () => {
    test('should initially be false', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      expect(self.suspended).toBe(false)
    })

    test('should be readonly', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      expect(() => {
        // @ts-expect-error - testing readonly
        self.suspended = true
      }).toThrow()
    })

    test('should be included in "in" operator', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      expect('suspended' in self).toBe(true)
    })
  })

  describe('circuit breaker', () => {
    // Helper to create a mock MessagePort
    function createMockPort() {
      const portListeners = new Map<string, Set<EventListener>>()
      return {
        postMessage: vi.fn(),
        close: vi.fn(),
        start: vi.fn(),
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          if (!portListeners.has(type)) {
            portListeners.set(type, new Set())
          }
          portListeners.get(type)!.add(listener)
        }),
        removeEventListener: vi.fn((type: string, listener: EventListener) => {
          portListeners.get(type)?.delete(listener)
        }),
        _dispatchEvent: (type: string, event: unknown) => {
          portListeners.get(type)?.forEach(listener => listener(event as Event))
        }
      }
    }

    function setupSession(_self: ReturnType<typeof createSvcWorker>) {
      const mockPort = createMockPort()
      // Update matchAll to return the client so it's not cleaned up as stale
      mockSelf.clients.matchAll = vi.fn(() => Promise.resolve([{ id: 'client-123' }] as Client[]))
      mockSelf._dispatchEvent('message', {
        data: { type: V_SW_SESSION_INIT },
        ports: [mockPort],
        source: { id: 'client-123' }
      })
      return mockPort
    }

    test('should handle CIRCUIT_BREAKER suspend message', async () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      const mockPort = setupSession(self)

      expect(self.suspended).toBe(false)

      // Send circuit breaker message
      mockPort._dispatchEvent('message', {
        data: {
          type: V_SW_SESSION_CIRCUIT_BREAKER,
          id: 'cb-1',
          mode: 'suspend'
        }
      })

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(self.suspended).toBe(true)
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        {
          type: V_SW_SESSION_CIRCUIT_BREAKER,
          id: 'cb-1',
          success: true,
          data: {
            mode: 'suspend',
            terminated: false,
            cachesCleared: []
          }
        },
        undefined
      )
    })

    test('should handle RESUME message', async () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      const mockPort = setupSession(self)

      // First suspend
      mockPort._dispatchEvent('message', {
        data: {
          type: V_SW_SESSION_CIRCUIT_BREAKER,
          id: 'cb-1',
          mode: 'suspend'
        }
      })

      await new Promise(resolve => setTimeout(resolve, 10))
      expect(self.suspended).toBe(true)

      // Then resume
      mockPort._dispatchEvent('message', {
        data: {
          type: V_SW_SESSION_RESUME,
          id: 'resume-1'
        }
      })

      expect(self.suspended).toBe(false)
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        {
          type: V_SW_SESSION_RESUME,
          id: 'resume-1',
          success: true,
          data: {}
        },
        undefined
      )
    })

    test('should log debug messages for circuit breaker', async () => {
      const debug = vi.fn()
      const self = createSvcWorker(mockSelf, { version: 'v1', debug })
      const mockPort = setupSession(self)

      mockPort._dispatchEvent('message', {
        data: {
          type: V_SW_SESSION_CIRCUIT_BREAKER,
          id: 'cb-1',
          mode: 'suspend'
        }
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(debug).toHaveBeenCalledWith('createSvcWorker: circuit breaker suspended')
    })

    test('should log debug messages for resume', () => {
      const debug = vi.fn()
      const self = createSvcWorker(mockSelf, { version: 'v1', debug })
      const mockPort = setupSession(self)

      // Resume (even without prior suspend)
      mockPort._dispatchEvent('message', {
        data: {
          type: V_SW_SESSION_RESUME,
          id: 'resume-1'
        }
      })

      expect(debug).toHaveBeenCalledWith('createSvcWorker: circuit breaker resumed')
    })
  })
})
