import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono/types'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

// Mock fs modules
vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn(() => {
      throw new Error('ENOENT')
    }),
    accessSync: vi.fn(() => {
      throw new Error('ENOENT')
    }),
    constants: {
      R_OK: 4,
    },
  }
}))

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(() => Promise.reject(new Error('ENOENT')))
  }
}))

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import type { ViteDevServer } from '../../server'
import type { ViteEnv } from '../index'
import { servePublicMiddleware, serveRawFsMiddleware, serveStaticMiddleware } from './static'

function createMockServer(options: {
  publicDir?: string
  base?: string
  root?: string
  headers?: Record<string, string>
  fsStrict?: boolean
  fsAllow?: string[]
  fsDenyGlob?: (path: string) => boolean
  safeModulePaths?: Set<string>
  resolveAlias?: Array<{ find: string | RegExp; replacement: string }>
} = {}): ViteDevServer {
  return {
    config: {
      publicDir: options.publicDir ?? '/public',
      base: options.base ?? '/',
      root: options.root ?? '/project',
      resolve: {
        alias: options.resolveAlias ?? [],
      },
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
  } as unknown as ViteDevServer
}

function createApp(middleware: MiddlewareHandler<ViteEnv>) {
  const app = new Hono<ViteEnv>()
  app.use('*', middleware)
  app.all('*', (c) => c.text('fallthrough'))
  return app
}

function requestWithRawUrl(app: Hono<ViteEnv>, pathname: string) {
  return app.fetch({
    method: 'GET',
    url: `http://localhost${pathname}`,
  } as Request)
}

describe('servePublicMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: fs operations throw (file not found)
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
  })

  describe('skip conditions', () => {
    test('should skip when publicFiles does not contain the file', async () => {
      const server = createMockServer()
      const publicFiles = new Set(['/existing.png'])
      const app = createApp(servePublicMiddleware(server, publicFiles))

      const res = await app.request('/nonexistent.png')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip import requests (?import)', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/file.js?import')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip import requests (&import)', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/file.js?t=123&import')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip internal requests (/@fs/)', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/@fs/some/path')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip internal requests (/@vite/client)', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/@vite/client')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip ?url query requests', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/public-file.js?url')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip ?url query with other params', async () => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/public-file.js?url&t=123')
      expect(await res.text()).toBe('fallthrough')
    })

    test.each([
      ['encoded parent segment', '/assets/%2e%2e/secret.js'],
      ['encoded backslash', '/assets/admin%5Csecret.js'],
      ['repeated slash', '/assets//secret.js'],
    ])('should reject %s', async (_, pathname) => {
      const server = createMockServer()
      const app = createApp(servePublicMiddleware(server))

      const res = await requestWithRawUrl(app, pathname)

      expect(await res.text()).toBe('fallthrough')
      expect(fsp.readFile).not.toHaveBeenCalled()
    })
  })

  describe('file serving', () => {
    test('should serve a file from publicDir', async () => {
      const content = new TextEncoder().encode('png content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer()
      const publicFiles = new Set(['/image.png'])
      const app = createApp(servePublicMiddleware(server, publicFiles))

      const res = await app.request('/image.png')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/png')
    })

    test('should set correct Content-Type for CSS files', async () => {
      const content = new TextEncoder().encode('body {}')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer()
      const publicFiles = new Set(['/style.css'])
      const app = createApp(servePublicMiddleware(server, publicFiles))

      const res = await app.request('/style.css')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/css')
    })

    test('should set correct Content-Type for JSON files', async () => {
      const content = new TextEncoder().encode('{}')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer()
      const publicFiles = new Set(['/data.json'])
      const app = createApp(servePublicMiddleware(server, publicFiles))

      const res = await app.request('/data.json')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')
    })

    test('should fall through when file does not exist', async () => {
      vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))

      const server = createMockServer()
      // No publicFiles set -> skip check is bypassed
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/nonexistent.png')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should apply server headers', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({
        headers: { 'X-Custom-Header': 'test-value' }
      })
      const publicFiles = new Set(['/image.png'])
      const app = createApp(servePublicMiddleware(server, publicFiles))

      const res = await app.request('/image.png')
      expect(res.headers.get('X-Custom-Header')).toBe('test-value')
    })

    test('should serve without publicFiles check when publicFiles is undefined', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer()
      // No publicFiles -> serves any file that exists on fs
      const app = createApp(servePublicMiddleware(server))

      const res = await app.request('/any-file.txt')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/plain')
    })
  })
})

describe('serveStaticMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
  })

  describe('skip conditions', () => {
    test('should skip HTML requests', async () => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/index.html')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip trailing slash requests', async () => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/some/dir/')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip internal requests', async () => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/@vite/client')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip // prefixed requests', async () => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('//some/path')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip malformed URI', async () => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/%invalid%uri')
      expect(await res.text()).toBe('fallthrough')
    })

    test.each([
      ['encoded parent segment', '/assets/%2e%2e/secret.js'],
      ['encoded backslash', '/assets/admin%5Csecret.js'],
      ['repeated slash', '/assets//secret.js'],
    ])('should reject %s', async (_, pathname) => {
      const server = createMockServer()
      const app = createApp(serveStaticMiddleware(server))

      const res = await requestWithRawUrl(app, pathname)

      expect(await res.text()).toBe('fallthrough')
      expect(fsp.readFile).not.toHaveBeenCalled()
    })
  })

  describe('file serving', () => {
    test('should serve a file from project root', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({ root: '/project' })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/image.png')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/png')
    })

    test('should set Content-Type to text/javascript for .ts files', async () => {
      const content = new TextEncoder().encode('const x = 1')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({ root: '/project' })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/script.ts')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/javascript')
    })

    test('should set Content-Type to text/javascript for .tsx files', async () => {
      const content = new TextEncoder().encode('export default () => <div/>')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({ root: '/project' })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/component.tsx')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/javascript')
    })

    test('should fall through when file does not exist', async () => {
      vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))

      const server = createMockServer({ root: '/project' })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/nonexistent.png')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should apply server headers', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({
        root: '/project',
        headers: { 'X-Custom-Header': 'test-value' },
      })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/image.png')
      expect(res.headers.get('X-Custom-Header')).toBe('test-value')
    })

    test('should serve an empty file', async () => {
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.alloc(0))

      const server = createMockServer({ root: '/project' })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/empty.txt')

      expect(res.status).toBe(200)
      expect((await res.arrayBuffer()).byteLength).toBe(0)
    })
  })

  describe('access control', () => {
    test('should return 403 for denied files', async () => {
      // Make file readable so checkLoadingAccess returns 'denied'
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(fs.accessSync).mockImplementation(() => { })

      const server = createMockServer({
        root: '/project',
        fsStrict: true,
        fsAllow: ['/project'],
        fsDenyGlob: () => true, // deny all
      })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/secret.env')
      expect(res.status).toBe(403)
    })

    test('should fall through for non-existent files outside allow list', async () => {
      // File doesn't exist → checkLoadingAccess returns 'fallback'
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const server = createMockServer({
        root: '/project',
        fsStrict: true,
        fsAllow: ['/other'],
      })
      const app = createApp(serveStaticMiddleware(server))

      const res = await app.request('/something.txt')
      expect(await res.text()).toBe('fallthrough')
    })
  })
})

describe('serveRawFsMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
    vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))
  })

  describe('skip conditions', () => {
    test('should skip requests without /@fs/ prefix', async () => {
      const server = createMockServer()
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/some/path')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should skip malformed URI', async () => {
      const server = createMockServer()
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/%invalid%uri')
      expect(await res.text()).toBe('fallthrough')
    })

    test.each([
      ['encoded parent segment', '/@fs/project/%2e%2e/secret.js'],
      ['encoded backslash', '/@fs/project/admin%5Csecret.js'],
      ['repeated slash', '/@fs/project//secret.js'],
    ])('should reject %s', async (_, pathname) => {
      const server = createMockServer()
      const app = createApp(serveRawFsMiddleware(server))

      const res = await requestWithRawUrl(app, pathname)

      expect(await res.text()).toBe('fallthrough')
      expect(fsp.readFile).not.toHaveBeenCalled()
    })
  })

  describe('file serving', () => {
    test('should serve a file with /@fs/ prefix', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer()
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/some/path/file.txt')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/plain')
    })

    test('should fall through when file does not exist', async () => {
      vi.mocked(fsp.readFile).mockRejectedValue(new Error('ENOENT'))

      const server = createMockServer()
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/nonexistent/file.txt')
      expect(await res.text()).toBe('fallthrough')
    })

    test('should apply server headers', async () => {
      const content = new TextEncoder().encode('file content')
      vi.mocked(fsp.readFile).mockResolvedValue(Buffer.from(content))

      const server = createMockServer({
        headers: { 'X-Custom-Header': 'test-value' },
      })
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/some/path/file.txt')
      expect(res.headers.get('X-Custom-Header')).toBe('test-value')
    })
  })

  describe('access control', () => {
    test('should return 403 for denied files', async () => {
      // Make file readable so checkLoadingAccess returns 'denied'
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(fs.accessSync).mockImplementation(() => { })

      const server = createMockServer({
        fsStrict: true,
        fsAllow: ['/allowed'],
        fsDenyGlob: () => true, // deny all
      })
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/etc/passwd')
      expect(res.status).toBe(403)
    })

    test('should fall through for non-existent files outside allow list', async () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const server = createMockServer({
        fsStrict: true,
        fsAllow: ['/allowed'],
      })
      const app = createApp(serveRawFsMiddleware(server))

      const res = await app.request('/@fs/other/path/file.txt')
      expect(await res.text()).toBe('fallthrough')
    })
  })
})
