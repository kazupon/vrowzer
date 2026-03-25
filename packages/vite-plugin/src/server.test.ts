import { describe, expect, test, vi } from 'vitest'
import { serverMiddlewarePlugin } from './server.ts'
import { resolveOptions } from './options.ts'

describe('serverMiddlewarePlugin', () => {
  test('plugin name is "vrowzer:server-middleware"', () => {
    const plugin = serverMiddlewarePlugin(resolveOptions({}))
    expect(plugin.name).toBe('vrowzer:server-middleware')
  })

  test('previewGuardMiddleware returns 503 for basePath requests', () => {
    const plugin = serverMiddlewarePlugin(resolveOptions({ basePath: '/__preview__/' }))

    const req = { url: '/__preview__/' } as any
    const res = {
      writeHead: vi.fn(),
      end: vi.fn()
    } as any
    const next = vi.fn()

    // Extract the middleware from configureServer
    const middlewares = { use: vi.fn() }
    ;(plugin as any).configureServer({ middlewares })
    const middleware = middlewares.use.mock.calls[0]![0]

    middleware(req, res, next)

    expect(res.writeHead).toHaveBeenCalledWith(
      503,
      expect.objectContaining({
        'Content-Type': 'text/html'
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  test('previewGuardMiddleware passes through non-basePath requests', () => {
    const plugin = serverMiddlewarePlugin(resolveOptions({ basePath: '/__preview__/' }))

    const req = { url: '/other-page' } as any
    const res = {
      writeHead: vi.fn(),
      end: vi.fn()
    } as any
    const next = vi.fn()

    const middlewares = { use: vi.fn() }
    ;(plugin as any).configureServer({ middlewares })
    const middleware = middlewares.use.mock.calls[0]![0]

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.writeHead).not.toHaveBeenCalled()
  })
})
