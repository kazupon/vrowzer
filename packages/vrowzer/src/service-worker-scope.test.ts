import { describe, expect, test } from 'vite-plus/test'
import { DEFAULT_SERVICE_WORKER_SCOPE, resolveServiceWorkerScope } from './service-worker-scope.ts'

describe('resolveServiceWorkerScope', () => {
  test('falls back to the default without runtime or injected values', () => {
    expect(resolveServiceWorkerScope()).toBe(DEFAULT_SERVICE_WORKER_SCOPE)
  })

  test('uses the runtime value without an injected value', () => {
    expect(resolveServiceWorkerScope('/runtime/', undefined)).toBe('/runtime/')
  })

  test('uses the injected value without a runtime value', () => {
    expect(resolveServiceWorkerScope(undefined, '/injected/')).toBe('/injected/')
  })

  test('accepts equal runtime and injected values', () => {
    expect(resolveServiceWorkerScope('/app/', '/app/')).toBe('/app/')
  })

  test('rejects different runtime and injected values', () => {
    expect(() => resolveServiceWorkerScope('/runtime/', '/injected/')).toThrow(
      'Vrowzer serviceWorkerScope "/runtime/" does not match @vrowzer/vite-plugin serviceWorkerScope "/injected/". Configure serviceWorkerScope in vite.config.ts.'
    )
  })
})
