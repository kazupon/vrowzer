import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

// Mock pluginContainer to avoid loading @vrowzer/rolldown WASM binding (which requires memfs with root dir)
vi.mock('../pluginContainer', () => ({
  BasicMinimalPluginContext: class {},
  basePluginContextMeta: {},
}))

// Mock fs modules
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    statSync: vi.fn(() => {
      throw new Error('ENOENT')
    }),
    accessSync: vi.fn(() => {
      throw new Error('ENOENT')
    }),
    constants: {
      R_OK: 4,
    },
  },
}))

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(() => Promise.reject(new Error('ENOENT'))),
  },
}))

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type { ViteDevServer } from '../../server'
import type { PreviewServer } from '../../preview'
import type { ViteEnv } from '../index'
import { indexHtmlMiddleware } from './indexHtml'

function createMockDevServer(options: {
  root?: string
  base?: string
  headers?: Record<string, string>
  fsStrict?: boolean
  fsAllow?: string[]
  fsDenyGlob?: (path: string) => boolean
  safeModulePaths?: Set<string>
  transformIndexHtml?: (url: string, html: string, originalUrl?: string) => Promise<string>
} = {}): ViteDevServer {
  return {
    // isDevServer checks for 'pluginContainer' in server
    pluginContainer: {},
    config: {
      root: options.root ?? '/project',
      base: options.base ?? '/',
      server: {
        headers: options.headers,
        fs: {
          strict: options.fsStrict ?? false,
          allow: options.fsAllow ?? ['/project'],
        },
      },
      fsDenyGlob: options.fsDenyGlob ?? (() => false),
      safeModulePaths: options.safeModulePaths ?? new Set(),
      logger: {
        error: vi.fn(),
        warnOnce: vi.fn(),
      },
    },
    transformIndexHtml: options.transformIndexHtml ?? vi.fn(async (_url, html) => html),
  } as unknown as ViteDevServer
}

function createMockPreviewServer(options: {
  root?: string
  headers?: Record<string, string>
} = {}): PreviewServer {
  return {
    config: {
      root: options.root ?? '/project',
      base: '/',
      preview: {
        headers: options.headers,
      },
      server: {
        fs: {
          strict: false,
          allow: ['/project'],
        },
      },
      fsDenyGlob: () => false,
      safeModulePaths: new Set(),
      logger: {
        error: vi.fn(),
        warnOnce: vi.fn(),
      },
    },
  } as unknown as PreviewServer
}

function createApp(middleware: MiddlewareHandler<ViteEnv>) {
  const app = new Hono<ViteEnv>()
  app.use('*', middleware)
  app.all('*', (c) => c.text('fallthrough'))
  return app
}

describe('indexHtmlMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
  })

  describe('skip conditions', () => {
    test('should skip non-HTML requests', async () => {
      const server = createMockDevServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/script.js')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip requests with sec-fetch-dest: script', async () => {
      const server = createMockDevServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html', {
        headers: { 'sec-fetch-dest': 'script' },
      })
      expect(await res.text()).toBe('fallthrough')
    })

    test('should fall through when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const server = createMockDevServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      expect(await res.text()).toBe('fallthrough')
    })
  })

  describe('dev server', () => {
    test('should serve index.html with 200 status', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html>hello</html>')

      const server = createMockDevServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/html')
    })

    test('should call transformIndexHtml with correct arguments', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html>original</html>')

      const transformIndexHtml = vi.fn(async (_url: string, html: string) => html)
      const server = createMockDevServer({ transformIndexHtml })
      const app = createApp(indexHtmlMiddleware('/project', server))

      await app.request('/index.html')

      expect(transformIndexHtml).toHaveBeenCalledWith(
        '/index.html',
        '<html>original</html>',
        '/index.html',
      )
    })

    test('should pass original path (c.req.path) as originalUrl to transformIndexHtml', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html></html>')

      const transformIndexHtml = vi.fn(async (_url: string, html: string) => html)
      const server = createMockDevServer({ transformIndexHtml })
      const app = createApp(indexHtmlMiddleware('/project', server))

      await app.request('/sub/page.html')

      // The third argument should be the original path (c.req.path)
      expect(transformIndexHtml).toHaveBeenCalledWith(
        '/sub/page.html',
        '<html></html>',
        '/sub/page.html',
      )
    })

    test('should return transformed HTML', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html>original</html>')

      const transformIndexHtml = vi.fn(async () => '<html>transformed</html>')
      const server = createMockDevServer({ transformIndexHtml })
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      const body = await res.text()
      expect(body).toBe('<html>transformed</html>')
    })

    test('should apply server headers', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html></html>')

      const server = createMockDevServer({
        headers: { 'X-Custom': 'value' },
      })
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      expect(res.headers.get('X-Custom')).toBe('value')
    })

    test('should throw when readFile fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockRejectedValue(new Error('read error'))

      const server = createMockDevServer()
      const app = new Hono<ViteEnv>()
      app.use('*', indexHtmlMiddleware('/project', server))
      app.onError((err, c) => c.text(err.message, 500))

      const res = await app.request('/index.html')
      expect(res.status).toBe(500)
      const body = await res.text()
      expect(body).toContain('Failed to load index.html')
    })

    describe('access control', () => {
      test('should return 403 for denied files', async () => {
        // Make file readable so checkLoadingAccess returns 'denied'
        vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any)
        vi.mocked(fs.accessSync).mockImplementation(() => {})

        const server = createMockDevServer({
          fsStrict: true,
          fsAllow: [],
          fsDenyGlob: () => true,
        })
        const app = createApp(indexHtmlMiddleware('/project', server))

        const res = await app.request('/secret.html')
        expect(res.status).toBe(403)
      })

      test('should fall through for non-existent files outside allow list', async () => {
        // File doesn't exist → checkLoadingAccess returns 'fallback'
        vi.mocked(fs.statSync).mockImplementation(() => {
          throw new Error('ENOENT')
        })
        vi.mocked(fs.accessSync).mockImplementation(() => {
          throw new Error('ENOENT')
        })

        const server = createMockDevServer({
          fsAllow: ['/other'],
        })
        const app = createApp(indexHtmlMiddleware('/project', server))

        const res = await app.request('/page.html')
        expect(await res.text()).toBe('fallthrough')
      })
    })
  })

  describe('preview server', () => {
    test('should serve HTML without calling transformIndexHtml', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html>preview</html>')

      const server = createMockPreviewServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).toBe('<html>preview</html>')
    })

    test('should fall through when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const server = createMockPreviewServer()
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/nonexistent.html')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should apply preview headers', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fsp.readFile).mockResolvedValue('<html></html>')

      const server = createMockPreviewServer({
        headers: { 'X-Preview': 'true' },
      })
      const app = createApp(indexHtmlMiddleware('/project', server))

      const res = await app.request('/index.html')
      expect(res.headers.get('X-Preview')).toBe('true')
    })
  })
})
