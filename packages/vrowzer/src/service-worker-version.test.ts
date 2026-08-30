import { describe, expect, test } from 'vite-plus/test'
import {
  DEFAULT_SERVICE_WORKER_VERSION,
  resolveServiceWorkerVersion,
  resolveServiceWorkerVersionForWorker,
  VROWZER_SERVICE_WORKER_VERSION_QUERY,
  withServiceWorkerVersion
} from './service-worker-version.ts'

describe('resolveServiceWorkerVersion', () => {
  test('falls back to the default without runtime or injected values', () => {
    expect(resolveServiceWorkerVersion()).toBe(DEFAULT_SERVICE_WORKER_VERSION)
  })

  test('uses the runtime value without an injected value', () => {
    expect(resolveServiceWorkerVersion('runtime-v2', undefined)).toBe('runtime-v2')
  })

  test('uses the injected value without a runtime value', () => {
    expect(resolveServiceWorkerVersion(undefined, 'injected-v2')).toBe('injected-v2')
  })

  test('accepts equal runtime and injected values', () => {
    expect(resolveServiceWorkerVersion('app-v2', 'app-v2')).toBe('app-v2')
  })

  test('rejects different runtime and injected values', () => {
    expect(() => resolveServiceWorkerVersion('runtime-v2', 'plugin-v3')).toThrow(
      'Vrowzer serviceWorkerVersion "runtime-v2" does not match @vrowzer/vite-plugin serviceWorkerVersion "plugin-v3". Configure serviceWorkerVersion in vite.config.ts.'
    )
  })

  test.each(['', ' app v2 ', 'version/β+二'])('preserves opaque value %j', value => {
    expect(resolveServiceWorkerVersion(value, undefined)).toBe(value)
    expect(resolveServiceWorkerVersion(undefined, value)).toBe(value)
    expect(resolveServiceWorkerVersion(value, value)).toBe(value)
  })
})

describe('withServiceWorkerVersion', () => {
  test('adds a version query to a URL without a query', () => {
    const result = withServiceWorkerVersion(new URL('https://example.test/service-worker.js'), 'v2')

    expect(result.searchParams.get(VROWZER_SERVICE_WORKER_VERSION_QUERY)).toBe('v2')
  })

  test('preserves existing query parameters', () => {
    const result = withServiceWorkerVersion(
      new URL('https://example.test/service-worker.ts?sw=service_worker_file&mode=dev'),
      'v2'
    )

    expect(result.searchParams.get('sw')).toBe('service_worker_file')
    expect(result.searchParams.get('mode')).toBe('dev')
    expect(result.searchParams.get(VROWZER_SERVICE_WORKER_VERSION_QUERY)).toBe('v2')
  })

  test('replaces an existing version query without leaving duplicates', () => {
    const result = withServiceWorkerVersion(
      new URL('https://example.test/service-worker.js?vrowzer-version=old&vrowzer-version=stale'),
      'current'
    )

    expect(result.searchParams.getAll(VROWZER_SERVICE_WORKER_VERSION_QUERY)).toEqual(['current'])
  })

  test.each(['', ' app v2 ', 'version/β+二'])('round-trips opaque version %j', version => {
    const result = withServiceWorkerVersion(
      new URL('https://example.test/service-worker.js'),
      version
    )

    expect(result.searchParams.get(VROWZER_SERVICE_WORKER_VERSION_QUERY)).toBe(version)
  })

  test('returns a clone without mutating the input URL', () => {
    const input = new URL('https://example.test/service-worker.js?existing=true')
    const result = withServiceWorkerVersion(input, 'v2')

    expect(result).not.toBe(input)
    expect(input.searchParams.has(VROWZER_SERVICE_WORKER_VERSION_QUERY)).toBe(false)
    expect(input.searchParams.get('existing')).toBe('true')
  })
})

describe('resolveServiceWorkerVersionForWorker', () => {
  test('falls back to the default without injected or query values', () => {
    expect(resolveServiceWorkerVersionForWorker('https://example.test/service-worker.js')).toBe(
      DEFAULT_SERVICE_WORKER_VERSION
    )
  })

  test('uses the query value without an injected value', () => {
    expect(
      resolveServiceWorkerVersionForWorker(
        'https://example.test/service-worker.js?vrowzer-version=query-v2',
        undefined
      )
    ).toBe('query-v2')
  })

  test('uses the injected value without a query value', () => {
    expect(
      resolveServiceWorkerVersionForWorker('https://example.test/service-worker.js', 'injected-v2')
    ).toBe('injected-v2')
  })

  test('accepts equal injected and query values', () => {
    expect(
      resolveServiceWorkerVersionForWorker(
        'https://example.test/service-worker.js?vrowzer-version=app-v2',
        'app-v2'
      )
    ).toBe('app-v2')
  })

  test('rejects different injected and query values', () => {
    expect(() =>
      resolveServiceWorkerVersionForWorker(
        'https://example.test/service-worker.js?vrowzer-version=query-v2',
        'injected-v3'
      )
    ).toThrow(
      'Vrowzer injected serviceWorkerVersion "injected-v3" does not match Service Worker script URL version "query-v2".'
    )
  })

  test('distinguishes an empty query value from a missing query', () => {
    expect(
      resolveServiceWorkerVersionForWorker(
        'https://example.test/service-worker.js?vrowzer-version=',
        undefined
      )
    ).toBe('')
  })

  test('ignores unrelated query parameters', () => {
    expect(
      resolveServiceWorkerVersionForWorker(
        'https://example.test/service-worker.js?sw=service_worker_file',
        undefined
      )
    ).toBe(DEFAULT_SERVICE_WORKER_VERSION)
  })

  test.each(['', ' app v2 ', 'version/β+二'])(
    'accepts a URL object and preserves opaque value %j',
    version => {
      const scriptURL = withServiceWorkerVersion(
        new URL('https://example.test/service-worker.js?sw=service_worker_file'),
        version
      )

      expect(resolveServiceWorkerVersionForWorker(scriptURL, undefined)).toBe(version)
      expect(resolveServiceWorkerVersionForWorker(scriptURL, version)).toBe(version)
      expect(
        resolveServiceWorkerVersionForWorker('https://example.test/service-worker.js', version)
      ).toBe(version)
    }
  )
})
