import { describe, expect, test, vi } from 'vitest'
import { getRequestPath } from './utils'

import type { Context } from 'hono'

// Mock context factory
function createMockContext(options: {
  url: string
  rewrittenUrl?: string
}): Context {
  return {
    req: {
      url: options.url
    },
    get: vi.fn((key: string) => {
      if (key === 'rewrittenUrl') { return options.rewrittenUrl }
      return undefined
    })
  } as unknown as Context
}

describe('getRequestPath', () => {
  test('should return rewrittenUrl when set by baseMiddleware', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/__preview__/page',
      rewrittenUrl: '/page'
    })

    expect(getRequestPath(c)).toBe('/page')
  })

  test('should return rewrittenUrl with query when set by baseMiddleware', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/__preview__/config.json?import',
      rewrittenUrl: '/config.json?import'
    })

    expect(getRequestPath(c)).toBe('/config.json?import')
  })

  test('should return path with query string when rewrittenUrl is not set', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/main.js?t=123'
    })

    expect(getRequestPath(c)).toBe('/main.js?t=123')
  })

  test('should return path without query when no query exists', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/page'
    })

    expect(getRequestPath(c)).toBe('/page')
  })

  test('should return rewrittenUrl even when it equals root', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/__preview__/',
      rewrittenUrl: '/'
    })

    expect(getRequestPath(c)).toBe('/')
  })

  test('should include ?import query for module requests', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/@id/config.json?import'
    })

    expect(getRequestPath(c)).toBe('/@id/config.json?import')
  })

  test('should include multiple query parameters', () => {
    const c = createMockContext({
      url: 'http://localhost:5173/main.js?import&t=1234567890'
    })

    expect(getRequestPath(c)).toBe('/main.js?import&t=1234567890')
  })
})
