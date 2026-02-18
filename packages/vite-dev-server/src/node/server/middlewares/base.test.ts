import { describe, expect, test, vi } from 'vitest'
import { baseMiddleware } from './base'

import type { Context, Next } from 'hono'

// Mock context factory
function createMockContext(options: {
  path: string
  acceptHeader?: string
}): Context {
  return {
    req: {
      path: options.path,
      url: `http://localhost${options.path}`,
      header: vi.fn((name: string) => {
        if (name === 'accept') {return options.acceptHeader}
        return undefined
      })
    },
    set: vi.fn(),
    redirect: vi.fn(),
    html: vi.fn(),
    text: vi.fn()
  } as unknown as Context
}

describe('baseMiddleware', () => {
  describe('when pathname starts with base', () => {
    test('should set rewrittenUrl and call next', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/app/page' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/page')
      expect(next).toHaveBeenCalled()
    })

    test('should handle base path exactly', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/app' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/')
      expect(next).toHaveBeenCalled()
    })
  })

  describe('when middlewareMode is true', () => {
    test('should call next without redirect for non-base paths', async () => {
      const middleware = baseMiddleware('/app', true)
      const c = createMockContext({ path: '/other' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.redirect).not.toHaveBeenCalled()
    })
  })

  describe('when accessing root path', () => {
    test('should redirect to base path', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.redirect).toHaveBeenCalledWith('/app', 302)
    })

    test('should redirect /index.html to base path', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/index.html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.redirect).toHaveBeenCalledWith('/app', 302)
    })
  })

  describe('when accessing non-base path (404)', () => {
    test('should return HTML 404 for text/html accept header', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/other', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.html).toHaveBeenCalled()
      // @ts-expect-error -- ignore for testing
      const [html, status] = (c.html as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(status).toBe(404)
      expect(html).toContain('/app')
    })

    test('should return plain text 404 for other accept headers', async () => {
      const middleware = baseMiddleware('/app', false)
      const c = createMockContext({ path: '/other', acceptHeader: 'application/json' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.text).toHaveBeenCalled()
      const [text, status] = (c.text as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(status).toBe(404)
      expect(text).toContain('/app')
    })
  })
})
