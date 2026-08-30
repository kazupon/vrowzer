import { describe, expect, test } from 'vite-plus/test'
import { resolveOptions } from './options.ts'

describe('resolveOptions', () => {
  test('returns default values when no options provided', () => {
    const resolved = resolveOptions({})

    expect(resolved.auto).toBe(true)
    expect(resolved.basePath).toBe('/__preview__/')
    expect(resolved.serviceWorkerScope).toBe('/')
    expect(resolved.serviceWorkerVersion).toBe('vrowzer-v1')
  })

  test('respects auto: false', () => {
    const resolved = resolveOptions({ auto: false })

    expect(resolved.auto).toBe(false)
  })

  test('respects custom basePath', () => {
    const resolved = resolveOptions({ basePath: '/__custom__/' })

    expect(resolved.basePath).toBe('/__custom__/')
  })

  test.each([
    ['/__custom__', '/__custom__/'],
    ['/__custom__///', '/__custom__/'],
    ['/app/__preview__', '/app/__preview__/'],
    ['/app/__preview__/', '/app/__preview__/']
  ])('normalizes basePath %s to %s', (basePath, expected) => {
    expect(resolveOptions({ basePath }).basePath).toBe(expected)
  })

  test.each(['', '/', 'preview/', '//example.com/preview/', '/preview/?mode=dev', '/preview/#x'])(
    'rejects invalid basePath %j',
    basePath => {
      expect(() => resolveOptions({ basePath })).toThrow(TypeError)
    }
  )

  test('respects custom serviceWorkerScope', () => {
    const resolved = resolveOptions({ serviceWorkerScope: '/app/' })

    expect(resolved.serviceWorkerScope).toBe('/app/')
  })

  test('respects custom serviceWorkerVersion', () => {
    const resolved = resolveOptions({ serviceWorkerVersion: 'v2.0.0' })

    expect(resolved.serviceWorkerVersion).toBe('v2.0.0')
  })

  test.each(['', ' app v2 ', 'version/β+二'])('preserves opaque serviceWorkerVersion %j', value => {
    expect(resolveOptions({ serviceWorkerVersion: value }).serviceWorkerVersion).toBe(value)
  })
})
