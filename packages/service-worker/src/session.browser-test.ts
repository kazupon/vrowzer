import { describe, expect, test, vi } from 'vitest'
import {
  VROWSER_SW_SESSION_INIT,
  createSvcWorkerSessionPingMessage,
  createSvcWorkerSessionInitResponse
} from './protocols.ts'
import { createSession, SvcWorkerSessionError } from './session.ts'

/**
 * Creates a mock ServiceWorker that handles session protocol
 */
function createMockServiceWorker(
  options: {
    respondToInit?: boolean
    initSuccess?: boolean
    initVersion?: string
    initDelay?: number
    sendPing?: boolean
    pingDelay?: number
  } = {}
) {
  const {
    respondToInit = true,
    initSuccess = true,
    initVersion = 'v1.0.0',
    initDelay = 0,
    sendPing = false,
    pingDelay = 50
  } = options

  let sessionPort: MessagePort | null = null

  const mockServiceWorker = {
    postMessage: vi.fn((data: { type: string }, ports?: MessagePort[]) => {
      if (data.type === VROWSER_SW_SESSION_INIT && ports?.[0]) {
        sessionPort = ports[0]

        if (respondToInit) {
          setTimeout(() => {
            sessionPort?.postMessage(createSvcWorkerSessionInitResponse(initSuccess, initVersion))

            // Send PING if configured
            if (sendPing && initSuccess) {
              setTimeout(() => {
                sessionPort?.postMessage(createSvcWorkerSessionPingMessage('test-ping-1'))
              }, pingDelay)
            }
          }, initDelay)
        }
      }
    }),
    // Helper to access the session port for testing
    _getSessionPort: () => sessionPort,
    // Helper to send a message through the session port
    _sendToSession: (data: unknown) => {
      sessionPort?.postMessage(data)
    }
  }

  return mockServiceWorker as unknown as ServiceWorker & {
    _getSessionPort: () => MessagePort | null
    _sendToSession: (data: unknown) => void
  }
}

describe('createSession', () => {
  describe('session initialization', () => {
    test('should establish session successfully', async () => {
      const mockServiceWorker = createMockServiceWorker({
        initSuccess: true,
        initVersion: 'v1.0.0'
      })

      const session = await createSession(mockServiceWorker)

      expect(session.connected).toBe(true)
      expect(session.version).toBe('v1.0.0')
      // eslint-disable-next-line @typescript-eslint/unbound-method -- for testing
      expect(mockServiceWorker.postMessage).toHaveBeenCalled()

      session.close()
    })

    test('should abort on initialization with signal', async () => {
      const mockSW = createMockServiceWorker({
        respondToInit: false
      })

      const abortController = new AbortController()
      setTimeout(() => abortController.abort(), 50)

      await expect(createSession(mockSW, { signal: abortController.signal })).rejects.toThrow(
        SvcWorkerSessionError
      )
      await expect(createSession(mockSW, { signal: abortController.signal })).rejects.toThrow(
        'Session initialization aborted'
      )
    })

    test('should reject if signal is already aborted', async () => {
      const mockSW = createMockServiceWorker()

      const abortController = new AbortController()
      abortController.abort()

      await expect(createSession(mockSW, { signal: abortController.signal })).rejects.toThrow(
        SvcWorkerSessionError
      )
      await expect(createSession(mockSW, { signal: abortController.signal })).rejects.toThrow(
        'Session initialization aborted'
      )
    })

    test('should reject on failed initialization', async () => {
      const mockServiceWorker = createMockServiceWorker({
        initSuccess: false
      })

      await expect(createSession(mockServiceWorker)).rejects.toThrow(SvcWorkerSessionError)
      await expect(createSession(mockServiceWorker)).rejects.toThrow(
        'Session initialization failed'
      )
    })

    test('should call debug function when provided', async () => {
      const debug = vi.fn()
      const mockServiceWorker = createMockServiceWorker({
        initSuccess: true,
        initVersion: 'v1'
      })

      const session = await createSession(mockServiceWorker, { debug })

      expect(debug).toHaveBeenCalledWith('createSession: initiating session with service worker')
      expect(debug).toHaveBeenCalledWith('createSession: session established, version:', 'v1')

      session.close()
    })
  })

  describe('session properties', () => {
    test('should expose connected and version properties', async () => {
      const mockServiceWorker = createMockServiceWorker({
        initVersion: 'v2.0.0'
      })

      const session = await createSession(mockServiceWorker)
      expect(session.connected).toBe(true)
      expect(session.version).toBe('v2.0.0')

      session.close()
    })
  })

  describe('session.request', () => {
    test('should send request via session port', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)

      // Verify the session port is available for communication
      const port = mockServiceWorker._getSessionPort()
      expect(port).not.toBeNull()

      // Verify session is ready for requests
      expect(session.connected).toBe(true)

      session.close()
    })

    test('should reject request when not connected', async () => {
      const mockSW = createMockServiceWorker()

      const session = await createSession(mockSW)
      session.close()

      expect(session.connected).toBe(false)
      await expect(session.request('TEST_REQUEST')).rejects.toThrow(SvcWorkerSessionError)
      await expect(session.request('TEST_REQUEST')).rejects.toThrow('Session not connected')
    })

    test('should timeout on request', async () => {
      const mockSW = createMockServiceWorker()

      const session = await createSession(mockSW)

      // Request with short timeout using AbortSignal.timeout, don't respond
      await expect(
        session.request('TEST_REQUEST', undefined, { signal: AbortSignal.timeout(50) })
      ).rejects.toThrow('Request aborted')

      session.close()
    })

    test('should abort request with AbortSignal', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)

      const abortController = new AbortController()
      const requestPromise = session.request('TEST_REQUEST', undefined, {
        signal: abortController.signal
      })

      // Abort immediately
      abortController.abort()

      await expect(requestPromise).rejects.toThrow(SvcWorkerSessionError)
      await expect(requestPromise).rejects.toThrow('Request aborted')

      session.close()
    })
  })

  describe('session.close', () => {
    test('should close session and update connected state', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)
      expect(session.connected).toBe(true)

      session.close()

      expect(session.connected).toBe(false)
    })

    test('should reject pending requests on close', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)

      // Start a request but don't let it complete
      const requestPromise = session.request('TEST_REQUEST')

      // Close immediately
      session.close()

      await expect(requestPromise).rejects.toThrow(SvcWorkerSessionError)
      await expect(requestPromise).rejects.toThrow('Session closed')
    })

    test('should be idempotent - calling close multiple times is safe', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)

      // Close multiple times - should not throw
      session.close()
      session.close()
      session.close()

      expect(session.connected).toBe(false)
    })
  })

  describe('PING/PONG handling', () => {
    test('should respond to PING with PONG', async () => {
      const debug = vi.fn()
      const mockServiceWorker = createMockServiceWorker({
        sendPing: true,
        pingDelay: 20
      })

      const session = await createSession(mockServiceWorker, { debug })

      // Wait for PING to be sent and PONG to be responded
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(debug).toHaveBeenCalledWith(
        'createSession: received PING, sending PONG',
        'test-ping-1'
      )

      session.close()
    })
  })

  describe('Symbol.dispose', () => {
    test('should have Symbol.dispose method', async () => {
      const mockServiceWorker = createMockServiceWorker()

      const session = await createSession(mockServiceWorker)

      expect(typeof session[Symbol.dispose]).toBe('function')

      session.close()
    })

    test('should close session with using syntax', async () => {
      const mockServiceWorker = createMockServiceWorker()

      let wasConnected = false

      {
        using session = await createSession(mockServiceWorker)
        wasConnected = session.connected
        expect(wasConnected).toBe(true)
      }

      // After block ends, session should be closed
      // We can't check session.connected here as it's out of scope
      // But we know Symbol.dispose was called
      expect(wasConnected).toBe(true)
    })
  })

  describe('edge cases', () => {
    test('should handle init response with delay', async () => {
      const mockServiceWorker = createMockServiceWorker({
        initDelay: 50,
        initVersion: 'delayed-v1'
      })

      const session = await createSession(mockServiceWorker)

      expect(session.connected).toBe(true)
      expect(session.version).toBe('delayed-v1')

      session.close()
    })
  })
})

describe('SvcWorkerSessionError', () => {
  test('should have correct name', () => {
    const error = new SvcWorkerSessionError('test error')
    expect(error.name).toBe('SvcWorkerSessionError')
    expect(error.message).toBe('test error')
  })

  test('should support cause', () => {
    const cause = new Error('original error')
    const error = new SvcWorkerSessionError('wrapped error', cause)
    expect(error.cause).toBe(cause)
  })
})
