import { describe, expect, test, vi } from 'vitest'
import { getRequestPath } from './utils'

import type { Context } from 'hono'

// Mock context factory
function createMockContext(options: {
  path: string
  rewrittenUrl?: string
}): Context {
  return {
    req: {
      path: options.path
    },
    get: vi.fn((key: string) => {
      if (key === 'rewrittenUrl') {return options.rewrittenUrl}
      return undefined
    })
  } as unknown as Context
}

describe('getRequestPath', () => {
  test('should return rewrittenUrl when set by baseMiddleware', () => {
    const c = createMockContext({
      path: '/app/page',
      rewrittenUrl: '/page'
    })

    const result = getRequestPath(c)

    expect(result).toBe('/page')
  })

  test('should return original path when rewrittenUrl is not set', () => {
    const c = createMockContext({
      path: '/page'
    })

    const result = getRequestPath(c)

    expect(result).toBe('/page')
  })

  test('should return rewrittenUrl even when it equals root', () => {
    const c = createMockContext({
      path: '/app',
      rewrittenUrl: '/'
    })

    const result = getRequestPath(c)

    expect(result).toBe('/')
  })
})
