import { describe, expect, test } from 'vitest'
import { resolveOptions } from './options.ts'

describe('resolveOptions', () => {
  test('returns default values when no options provided', () => {
    const resolved = resolveOptions({})

    expect(resolved.basePath).toBe('/__preview__/')
    expect(resolved.serviceWorkerScope).toBe('/')
    expect(resolved.serviceWorkerVersion).toBe('SERVICE_WORKER_VERSION')
  })

  test('respects custom basePath', () => {
    const resolved = resolveOptions({ basePath: '/__custom__/' })

    expect(resolved.basePath).toBe('/__custom__/')
  })

  test('respects custom serviceWorkerScope', () => {
    const resolved = resolveOptions({ serviceWorkerScope: '/app/' })

    expect(resolved.serviceWorkerScope).toBe('/app/')
  })

  test('respects custom serviceWorkerVersion', () => {
    const resolved = resolveOptions({ serviceWorkerVersion: 'v2.0.0' })

    expect(resolved.serviceWorkerVersion).toBe('v2.0.0')
  })
})
