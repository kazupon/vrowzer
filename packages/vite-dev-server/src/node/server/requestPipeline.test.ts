import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import type { Context, Next } from 'hono'
import type { SerializedRequest } from '../../shared/rpc'
import type { ViteDevServer } from './index'

const middlewareMocks = vi.hoisted(() => {
  // The names of the middlewares that a request passed, in order
  const calls: string[] = []
  const passing = (name: string) => async (_c: Context, next: Next) => {
    calls.push(name)
    await next()
  }
  return {
    calls,
    passing,
    baseMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('base')),
    errorMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => (error: Error, c: Context) =>
      c.text(`error page: ${error.message}`, 500)),
    htmlFallbackMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('htmlFallback')),
    indexHtmlMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('indexHtml')),
    notFoundMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => async (c: Context) => {
      calls.push('notFound')
      return c.body(null, 404)
    }),
    servePublicMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('public')),
    serveRawFsMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('rawFs')),
    serveStaticMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('static')),
    transformMiddleware: vi.fn<(...args: unknown[]) => unknown>(() => passing('transform')),
  }
})

vi.mock('./middlewares/base', () => ({ baseMiddleware: middlewareMocks.baseMiddleware }))
vi.mock('./middlewares/error', () => ({ errorMiddleware: middlewareMocks.errorMiddleware }))
vi.mock('./middlewares/htmlFallback', () => ({
  htmlFallbackMiddleware: middlewareMocks.htmlFallbackMiddleware,
}))
vi.mock('./middlewares/indexHtml', () => ({ indexHtmlMiddleware: middlewareMocks.indexHtmlMiddleware }))
vi.mock('./middlewares/notFound', () => ({ notFoundMiddleware: middlewareMocks.notFoundMiddleware }))
vi.mock('./middlewares/static', () => ({
  servePublicMiddleware: middlewareMocks.servePublicMiddleware,
  serveRawFsMiddleware: middlewareMocks.serveRawFsMiddleware,
  serveStaticMiddleware: middlewareMocks.serveStaticMiddleware,
}))
vi.mock('./middlewares/transform', () => ({ transformMiddleware: middlewareMocks.transformMiddleware }))

import { createRequestPipeline } from './requestPipeline'

const { calls, passing } = middlewareMocks

function createServer(config: Record<string, unknown> = {}): ViteDevServer {
  return {
    config: {
      root: '/',
      base: '/__preview__/',
      rawBase: '/__preview__/',
      publicDir: '/public',
      appType: 'spa',
      server: {},
      ...config,
    },
  } as unknown as ViteDevServer
}

function request(path: string, init: Partial<SerializedRequest> = {}): SerializedRequest {
  return {
    url: `https://example.com${path}`,
    method: 'GET',
    headers: [],
    body: null,
    ...init,
  }
}

function text(buffer: ArrayBuffer | null): string | null {
  return buffer === null ? null : new TextDecoder().decode(buffer)
}

describe('request pipeline', () => {
  beforeEach(() => {
    calls.length = 0
    vi.clearAllMocks()
  })

  test('runs the middlewares of plugins and the internal middlewares in the order of the Vite dev server', async () => {
    const server = createServer()
    const publicFiles = new Set(['/hello.txt'])
    const pipeline = createRequestPipeline('/__preview__')
    // A plugin adds a middleware in configureServer, and another one in the function it returns
    pipeline.middlewares.use(passing('plugin'))
    const postHook = () => {
      pipeline.middlewares.use(passing('plugin post'))
    }

    pipeline.applyInternalMiddlewares(server, publicFiles, [postHook, undefined])
    const response = await pipeline.handleRequest(request('/__preview__/missing.txt'))

    expect(calls).toEqual([
      'plugin',
      'base',
      'public',
      'transform',
      'rawFs',
      'static',
      'htmlFallback',
      'plugin post',
      'indexHtml',
      'notFound',
    ])
    expect(response.status).toBe(404)
    expect(middlewareMocks.baseMiddleware).toHaveBeenCalledWith('/__preview__/', false)
    expect(middlewareMocks.servePublicMiddleware).toHaveBeenCalledWith(server, publicFiles)
    expect(middlewareMocks.transformMiddleware).toHaveBeenCalledWith(server)
    expect(middlewareMocks.serveRawFsMiddleware).toHaveBeenCalledWith(server)
    expect(middlewareMocks.serveStaticMiddleware).toHaveBeenCalledWith(server)
    expect(middlewareMocks.htmlFallbackMiddleware).toHaveBeenCalledWith('/', true)
    expect(middlewareMocks.indexHtmlMiddleware).toHaveBeenCalledWith('/', server, { isDev: true })
    expect(middlewareMocks.errorMiddleware).toHaveBeenCalledWith(server, false)
  })

  test('leaves out the middlewares that the config does not use', async () => {
    const pipeline = createRequestPipeline()

    pipeline.applyInternalMiddlewares(
      createServer({ base: '/', rawBase: '/', publicDir: '', appType: 'custom' }),
      undefined,
      [],
    )
    const response = await pipeline.handleRequest(request('/missing.txt'))

    expect(calls).toEqual(['transform', 'rawFs', 'static'])
    expect(response.status).toBe(404)
  })

  test('falls back to index.html without the SPA fallback in an MPA', async () => {
    const pipeline = createRequestPipeline('/__preview__')

    pipeline.applyInternalMiddlewares(createServer({ appType: 'mpa' }), undefined, [])
    await pipeline.handleRequest(request('/__preview__/about/'))

    expect(middlewareMocks.htmlFallbackMiddleware).toHaveBeenCalledWith('/', false)
    expect(calls).toContain('indexHtml')
  })

  test('answers with the response of a middleware', async () => {
    const pipeline = createRequestPipeline('/__preview__')
    // Paths are relative to the base path, as in the Service Worker
    pipeline.middlewares.use('/api', async c => {
      const body = `${c.req.method} ${c.req.header('x-input')} ${await c.req.text()}`
      return c.text(body, 201, { 'x-plugin': 'yes' })
    })
    pipeline.applyInternalMiddlewares(createServer(), undefined, [])

    const response = await pipeline.handleRequest(request('/__preview__/api', {
      method: 'POST',
      headers: [['x-input', 'header']],
      body: new TextEncoder().encode('body').buffer as ArrayBuffer,
    }))

    expect(response.status).toBe(201)
    expect(response.headers).toContainEqual(['x-plugin', 'yes'])
    expect(text(response.body)).toBe('POST header body')
    // The internal middlewares come after the plugin's
    expect(calls).toEqual([])
  })

  test('answers an error with the error middleware', async () => {
    const pipeline = createRequestPipeline('/__preview__')
    pipeline.middlewares.use(async () => {
      throw new Error('Transform failed')
    })
    pipeline.applyInternalMiddlewares(createServer(), undefined, [])

    const response = await pipeline.handleRequest(request('/__preview__/src/main.ts'))

    expect(response.status).toBe(500)
    expect(text(response.body)).toBe('error page: Transform failed')
  })

  test('does not run the middlewares for a request outside the base path', async () => {
    const pipeline = createRequestPipeline('/__preview__')
    pipeline.applyInternalMiddlewares(createServer(), undefined, [])

    const response = await pipeline.handleRequest(request('/other/index.html'))

    expect(response.status).toBe(404)
    expect(calls).toEqual([])
  })
})
