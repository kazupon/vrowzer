import { beforeEach, describe, expect, test, vi } from 'vitest'
import { VROWSER_SW_SKIP_WAITING, VROWSER_SW_VERSION } from './protocols.ts'
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
    clients: { claim: vi.fn() }
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

  describe('VROWSER_SW_VERSION message', () => {
    test('should respond with version via MessagePort', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1.2.3' })
      void self // ensure self is created

      const mockPort = { postMessage: vi.fn() }
      const messageEvent = {
        data: { type: VROWSER_SW_VERSION },
        ports: [mockPort]
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(mockPort.postMessage).toHaveBeenCalledWith({ version: 'v1.2.3' })
    })

    test('should not respond if no port provided', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { type: VROWSER_SW_VERSION },
        ports: []
      }

      // Should not throw
      expect(() => mockSelf._dispatchEvent('message', messageEvent)).not.toThrow()
    })
  })

  describe('VROWSER_SW_SKIP_WAITING message', () => {
    test('should call skipWaiting on message', () => {
      const self = createSvcWorker(mockSelf, { version: 'v1' })
      void self

      const messageEvent = {
        data: { type: VROWSER_SW_SKIP_WAITING },
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
        data: { type: VROWSER_SW_VERSION },
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
        data: { type: VROWSER_SW_VERSION },
        ports: [mockPort]
      }

      mockSelf._dispatchEvent('message', messageEvent)

      expect(debug).toHaveBeenCalledWith('createSvcWorker: received message', VROWSER_SW_VERSION)
      expect(debug).toHaveBeenCalledWith('createSvcWorker: responding with version', 'v1')
    })
  })
})
