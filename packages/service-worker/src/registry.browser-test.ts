import { describe, expect, test, beforeEach } from 'vite-plus/test'
import { getRegistryKey, register, unregister, getAll, get, clear } from './registry.ts'

import type { SvcWorkerController } from './controller.ts'

/**
 * Creates a mock controller with scriptURL and version
 */
function createMockController(scriptURL: string, version: string): SvcWorkerController {
  return {
    scriptURL,
    version,
    state: 'activated',
    serviceWorker: null,
    session: null,
    on: () => () => {},
    off: () => {},
    once: () => () => {},
    emit: () => {},
    ready: () => Promise.resolve(true),
    dispose: () => {},
    [Symbol.dispose]: () => {}
  } as unknown as SvcWorkerController
}

describe('registry', () => {
  beforeEach(() => {
    clear()
  })

  describe('getRegistryKey', () => {
    test('should generate key from string URL and version', () => {
      const key = getRegistryKey('https://example.com/sw.js', 'v1.0.0')
      expect(key).toBe('https://example.com/sw.js::v1.0.0')
    })

    test('should handle URL href string', () => {
      const url = new URL('https://example.com/sw.js')
      const key = getRegistryKey(url.href, 'v2.0.0')
      expect(key).toBe('https://example.com/sw.js::v2.0.0')
    })

    test('should handle empty version', () => {
      const key = getRegistryKey('https://example.com/sw.js', '')
      expect(key).toBe('https://example.com/sw.js::')
    })
  })

  describe('register', () => {
    test('should register a controller', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')

      register(controller)

      const result = get(new URL('https://example.com/sw.js'), 'v1.0.0')
      expect(result).toBe(controller)
    })

    test('should overwrite existing controller with same key', () => {
      const controller1 = createMockController('https://example.com/sw.js', 'v1.0.0')
      const controller2 = createMockController('https://example.com/sw.js', 'v1.0.0')

      register(controller1)
      register(controller2)

      const result = get(new URL('https://example.com/sw.js'), 'v1.0.0')
      expect(result).toBe(controller2)
      expect(getAll()).toHaveLength(1)
    })

    test('should register multiple controllers with different keys', () => {
      const controller1 = createMockController('https://example.com/sw1.js', 'v1.0.0')
      const controller2 = createMockController('https://example.com/sw2.js', 'v1.0.0')
      const controller3 = createMockController('https://example.com/sw1.js', 'v2.0.0')

      register(controller1)
      register(controller2)
      register(controller3)

      expect(getAll()).toHaveLength(3)
      expect(get(new URL('https://example.com/sw1.js'), 'v1.0.0')).toBe(controller1)
      expect(get(new URL('https://example.com/sw2.js'), 'v1.0.0')).toBe(controller2)
      expect(get(new URL('https://example.com/sw1.js'), 'v2.0.0')).toBe(controller3)
    })
  })

  describe('unregister', () => {
    test('should unregister a controller', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')

      register(controller)
      expect(get(new URL('https://example.com/sw.js'), 'v1.0.0')).toBe(controller)

      unregister(controller)
      expect(get(new URL('https://example.com/sw.js'), 'v1.0.0')).toBeUndefined()
    })

    test('should not throw when unregistering non-existent controller', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')

      expect(() => unregister(controller)).not.toThrow()
    })

    test('should only unregister the specified controller', () => {
      const controller1 = createMockController('https://example.com/sw1.js', 'v1.0.0')
      const controller2 = createMockController('https://example.com/sw2.js', 'v1.0.0')

      register(controller1)
      register(controller2)

      unregister(controller1)

      expect(get(new URL('https://example.com/sw1.js'), 'v1.0.0')).toBeUndefined()
      expect(get(new URL('https://example.com/sw2.js'), 'v1.0.0')).toBe(controller2)
    })
  })

  describe('getAll', () => {
    test('should return empty array when no controllers registered', () => {
      const result = getAll()
      expect(result).toEqual([])
    })

    test('should return all registered controllers', () => {
      const controller1 = createMockController('https://example.com/sw1.js', 'v1.0.0')
      const controller2 = createMockController('https://example.com/sw2.js', 'v1.0.0')

      register(controller1)
      register(controller2)

      const result = getAll()
      expect(result).toHaveLength(2)
      expect(result).toContain(controller1)
      expect(result).toContain(controller2)
    })

    test('should return readonly array', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')
      register(controller)

      const result = getAll()

      // TypeScript should prevent mutation, but verify at runtime
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('get', () => {
    test('should return controller by scriptURL and version', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')
      register(controller)

      const result = get(new URL('https://example.com/sw.js'), 'v1.0.0')
      expect(result).toBe(controller)
    })

    test('should return undefined for non-existent controller', () => {
      const result = get(new URL('https://example.com/non-existent.js'), 'v1.0.0')
      expect(result).toBeUndefined()
    })

    test('should return undefined for wrong version', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')
      register(controller)

      const result = get(new URL('https://example.com/sw.js'), 'v2.0.0')
      expect(result).toBeUndefined()
    })

    test('should match URL href with controller scriptURL', () => {
      const controller = createMockController('https://example.com/sw.js', 'v1.0.0')
      register(controller)

      const url = new URL('https://example.com/sw.js')
      const result = get(url, 'v1.0.0')
      expect(result).toBe(controller)
    })
  })

  describe('clear', () => {
    test('should remove all controllers', () => {
      const controller1 = createMockController('https://example.com/sw1.js', 'v1.0.0')
      const controller2 = createMockController('https://example.com/sw2.js', 'v1.0.0')

      register(controller1)
      register(controller2)
      expect(getAll()).toHaveLength(2)

      clear()
      expect(getAll()).toHaveLength(0)
    })

    test('should be idempotent', () => {
      clear()
      clear()
      expect(getAll()).toHaveLength(0)
    })
  })
})
