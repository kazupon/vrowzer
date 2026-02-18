import { describe, expect, test, vi } from 'vitest'
import { htmlFallbackMiddleware } from './htmlFallback'

import type { Context, Next } from 'hono'

// Mock fs and path
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn()
  }
}))

import fs from 'node:fs'

function createMockContext(options: {
  method?: string
  path: string
  acceptHeader?: string | undefined
}): Context {
  const method = options.method ?? 'GET'
  return {
    req: {
      method,
      path: options.path,
      url: `http://localhost${options.path}`,
      header: vi.fn((name: string) => {
        if (name === 'accept') {return options.acceptHeader}
        return undefined
      })
    },
    get: vi.fn((key: string) => {
      if (key === 'rewrittenUrl') {return undefined}
      return undefined
    }),
    set: vi.fn()
  } as unknown as Context
}

describe('htmlFallbackMiddleware', () => {
  describe('skip conditions', () => {
    test('should skip POST requests', async () => {
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ method: 'POST', path: '/page' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.set).not.toHaveBeenCalled()
    })

    test('should skip /favicon.ico', async () => {
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/favicon.ico' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.set).not.toHaveBeenCalled()
    })

    test('should skip when accept header does not include text/html or */*', async () => {
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/api/data', acceptHeader: 'application/json' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.set).not.toHaveBeenCalled()
    })

    test('should not skip when accept is undefined (equivalent to */*)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/page', acceptHeader: undefined })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      // Should proceed to SPA fallback
      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/index.html')
    })

    test('should not skip when accept is empty string (equivalent to */*)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/page', acceptHeader: '' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/index.html')
    })

    test('should allow HEAD requests', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ method: 'HEAD', path: '/page', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      // Should proceed to SPA fallback (not skipped)
      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/index.html')
    })
  })

  describe('.html file fallback', () => {
    test('should rewrite to .html file if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/page.html', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/page.html')
      expect(next).toHaveBeenCalled()
    })

    test('should not rewrite to .html if file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/missing.html', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      // No rewrite, just next()
      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('trailing slash fallback', () => {
    test('should rewrite /dir/ to /dir/index.html if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/dir/', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/dir/index.html')
      expect(next).toHaveBeenCalled()
    })

    test('should not rewrite /dir/ if index.html does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/dir/', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
    })
  })

  describe('non-trailing slash fallback', () => {
    test('should rewrite /page to /page.html if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/page', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/page.html')
      expect(next).toHaveBeenCalled()
    })

    test('should not rewrite /page if page.html does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/page', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      // No rewrite, no SPA fallback (spaFallback is false)
      expect(c.set).not.toHaveBeenCalled()
    })
  })

  describe('SPA fallback', () => {
    test('should rewrite to /index.html when spaFallback is true and no file matches', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/any/route', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).toHaveBeenCalledWith('rewrittenUrl', '/index.html')
      expect(next).toHaveBeenCalled()
    })

    test('should not rewrite to /index.html when spaFallback is false', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const middleware = htmlFallbackMiddleware('/root', false)
      const c = createMockContext({ path: '/any/route', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(c.set).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })

  describe('malformed URI', () => {
    test('should skip on malformed URI', async () => {
      const middleware = htmlFallbackMiddleware('/root', true)
      const c = createMockContext({ path: '/%E0%A4%A', acceptHeader: 'text/html' })
      const next = vi.fn() as unknown as Next

      await middleware(c, next)

      expect(next).toHaveBeenCalled()
      expect(c.set).not.toHaveBeenCalled()
    })
  })
})
