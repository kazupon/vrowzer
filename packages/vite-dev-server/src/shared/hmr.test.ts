import { beforeEach, describe, expect, test, vi } from 'vitest'
import { HMRClient, HMRContext } from './hmr'

import type { Update } from '#types/hmrPayload'
import type { HMRLogger } from './hmr'
import type { NormalizedModuleRunnerTransport } from './moduleRunnerTransport'

describe('HMRContext', () => {
  test('data property returns correct data object', () => {
    const mockHMRClient = {
      dataMap: new Map<string, any>(),
      hotModulesMap: new Map(),
      ctxToListenersMap: new Map(),
      customListenersMap: new Map(),
    } as any

    const ownerPath = '/path/to/module'
    const hmrContext = new HMRContext(mockHMRClient, ownerPath)

    // Initially, the data should be an empty object
    expect(hmrContext.data).toEqual({})

    // Set some data and verify it's returned correctly
    const testData = { foo: 'bar' }
    mockHMRClient.dataMap.set(ownerPath, testData)
    expect(hmrContext.data).toEqual(testData)
  })
})

describe('HMRClient', () => {
  let mockLogger: HMRLogger
  let mockTransport: NormalizedModuleRunnerTransport
  let mockImportUpdatedModule: (update: Update) => Promise<any>

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      debug: vi.fn(),
    }
    mockTransport = {
      send: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn().mockResolvedValue(undefined),
    }
    mockImportUpdatedModule = vi.fn().mockResolvedValue({ default: {} })
  })

  describe('constructor', () => {
    test('initializes with empty maps', () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      expect(client.hotModulesMap.size).toBe(0)
      expect(client.disposeMap.size).toBe(0)
      expect(client.pruneMap.size).toBe(0)
      expect(client.dataMap.size).toBe(0)
      expect(client.customListenersMap.size).toBe(0)
      expect(client.ctxToListenersMap.size).toBe(0)
    })
  })

  describe('notifyListeners', () => {
    test('calls registered listeners for the event', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      client.customListenersMap.set('test-event', [listener1, listener2])

      await client.notifyListeners('test-event', { foo: 'bar' })

      expect(listener1).toHaveBeenCalledWith({ foo: 'bar' })
      expect(listener2).toHaveBeenCalledWith({ foo: 'bar' })
    })

    test('does nothing if no listeners registered', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      await expect(client.notifyListeners('unknown-event', {})).resolves.toBeUndefined()
    })

    test('handles listener errors gracefully with Promise.allSettled', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const errorListener = vi.fn().mockRejectedValue(new Error('listener error'))
      const successListener = vi.fn()

      client.customListenersMap.set('test-event', [errorListener, successListener])

      await client.notifyListeners('test-event', { data: 'test' })

      expect(errorListener).toHaveBeenCalled()
      expect(successListener).toHaveBeenCalled()
    })
  })

  describe('send', () => {
    test('sends payload via transport', () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const payload = { type: 'custom' as const, event: 'test', data: {} }

      client.send(payload)

      expect(mockTransport.send).toHaveBeenCalledWith(payload)
    })

    test('logs error if transport.send fails', async () => {
      const error = new Error('send failed')
      mockTransport.send = vi.fn().mockRejectedValue(error)
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.send({ type: 'custom', event: 'test', data: {} })

      await vi.waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(error)
      })
    })
  })

  describe('clear', () => {
    test('clears all maps', () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.hotModulesMap.set('/test', { id: '/test', callbacks: [] })
      client.disposeMap.set('/test', () => { })
      client.pruneMap.set('/test', () => { })
      client.dataMap.set('/test', { data: 'test' })
      client.customListenersMap.set('event', [() => { }])
      client.ctxToListenersMap.set('/test', new Map())

      client.clear()

      expect(client.hotModulesMap.size).toBe(0)
      expect(client.disposeMap.size).toBe(0)
      expect(client.pruneMap.size).toBe(0)
      expect(client.dataMap.size).toBe(0)
      expect(client.customListenersMap.size).toBe(0)
      expect(client.ctxToListenersMap.size).toBe(0)
    })
  })

  describe('prunePaths', () => {
    test('calls dispose callback for each path', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const disposeCallback = vi.fn()

      client.dataMap.set('/module1', { preserved: true })
      client.disposeMap.set('/module1', disposeCallback)

      await client.prunePaths(['/module1'])

      expect(disposeCallback).toHaveBeenCalledWith({ preserved: true })
    })

    test('calls prune callback for each path', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const pruneCallback = vi.fn()

      client.dataMap.set('/module1', { data: 'test' })
      client.pruneMap.set('/module1', pruneCallback)

      await client.prunePaths(['/module1'])

      expect(pruneCallback).toHaveBeenCalledWith({ data: 'test' })
    })

    test('calls both dispose and prune callbacks in order', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const callOrder: string[] = []

      client.dataMap.set('/module1', { data: 'test' })
      client.disposeMap.set('/module1', () => {
        callOrder.push('dispose')
      })
      client.pruneMap.set('/module1', () => {
        callOrder.push('prune')
      })

      await client.prunePaths(['/module1'])

      expect(callOrder).toEqual(['dispose', 'prune'])
    })

    test('handles multiple paths', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const dispose1 = vi.fn()
      const dispose2 = vi.fn()

      client.disposeMap.set('/module1', dispose1)
      client.disposeMap.set('/module2', dispose2)

      await client.prunePaths(['/module1', '/module2'])

      expect(dispose1).toHaveBeenCalled()
      expect(dispose2).toHaveBeenCalled()
    })

    test('does nothing for paths without callbacks', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      await expect(client.prunePaths(['/unknown'])).resolves.toBeUndefined()
    })
  })

  describe('queueUpdate', () => {
    test('imports updated module', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
      }

      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{ deps: ['/module.js'], fn: vi.fn() }],
      })

      await client.queueUpdate(update)

      expect(mockImportUpdatedModule).toHaveBeenCalledWith(update)
    })

    test('calls callback with fetched module', async () => {
      const fetchedModule = { default: 'updated' }
      mockImportUpdatedModule = vi.fn().mockResolvedValue(fetchedModule)

      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      const callback = vi.fn()

      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
      }

      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{ deps: ['/module.js'], fn: callback }],
      })

      await client.queueUpdate(update)

      expect(callback).toHaveBeenCalledWith([fetchedModule])
    })

    test('does nothing if module is not in hotModulesMap', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      const update: Update = {
        type: 'js-update',
        path: '/unknown.js',
        acceptedPath: '/unknown.js',
        timestamp: Date.now(),
      }

      await client.queueUpdate(update)

      expect(mockImportUpdatedModule).not.toHaveBeenCalled()
    })

    test('calls dispose callback before importing', async () => {
      const callOrder: string[] = []

      mockImportUpdatedModule = vi.fn().mockImplementation(async () => {
        callOrder.push('import')
        return { default: {} }
      })

      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.dataMap.set('/module.js', { preserved: true })
      client.disposeMap.set('/module.js', () => {
        callOrder.push('dispose')
      })
      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{ deps: ['/module.js'], fn: vi.fn() }],
      })

      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
      }

      await client.queueUpdate(update)

      expect(callOrder).toEqual(['dispose', 'import'])
    })

    test('logs debug message after successful update', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{ deps: ['/module.js'], fn: vi.fn() }],
      })

      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
      }

      await client.queueUpdate(update)

      expect(mockLogger.debug).toHaveBeenCalledWith('hot updated: /module.js')
    })

    test('buffers multiple updates and executes them in order', async () => {
      const callOrder: string[] = []

      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.hotModulesMap.set('/module1.js', {
        id: '/module1.js',
        callbacks: [{
          deps: ['/module1.js'],
          fn: () => { callOrder.push('module1') }
        }],
      })
      client.hotModulesMap.set('/module2.js', {
        id: '/module2.js',
        callbacks: [{
          deps: ['/module2.js'],
          fn: () => { callOrder.push('module2') }
        }],
      })

      const update1: Update = {
        type: 'js-update',
        path: '/module1.js',
        acceptedPath: '/module1.js',
        timestamp: Date.now(),
      }
      const update2: Update = {
        type: 'js-update',
        path: '/module2.js',
        acceptedPath: '/module2.js',
        timestamp: Date.now(),
      }

      await Promise.all([
        client.queueUpdate(update1),
        client.queueUpdate(update2),
      ])

      expect(callOrder).toEqual(['module1', 'module2'])
    })

    test('handles import error gracefully', async () => {
      const importError = new Error('import failed')
      mockImportUpdatedModule = vi.fn().mockRejectedValue(importError)

      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)

      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{ deps: ['/module.js'], fn: vi.fn() }],
      })

      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
      }

      await client.queueUpdate(update)

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('sets currentFirstInvalidatedBy during callback execution', async () => {
      const client = new HMRClient(mockLogger, mockTransport, mockImportUpdatedModule)
      let capturedFirstInvalidatedBy: string | undefined

      client.hotModulesMap.set('/module.js', {
        id: '/module.js',
        callbacks: [{
          deps: ['/module.js'],
          fn: () => {
            capturedFirstInvalidatedBy = client.currentFirstInvalidatedBy
          }
        }],
      })

      const update: Update = {
        type: 'js-update',
        path: '/module.js',
        acceptedPath: '/module.js',
        timestamp: Date.now(),
        firstInvalidatedBy: '/trigger.js',
      }

      await client.queueUpdate(update)

      expect(capturedFirstInvalidatedBy).toBe('/trigger.js')
      expect(client.currentFirstInvalidatedBy).toBeUndefined()
    })
  })
})
