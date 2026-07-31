import { describe, expect, it, vi } from 'vite-plus/test'
import { send } from './send'

import type { Context } from 'hono'
import type { SourceMap } from 'rolldown'
import type { ViteEnv } from './index'

/**
 * Create a mock Hono context for testing
 */
function createMockContext(options: {
  method?: string
  path?: string
  ifNoneMatch?: string
} = {}): Context<ViteEnv> {
  const { method = 'GET', path = '/test.js', ifNoneMatch } = options

  return {
    req: {
      method,
      url: `http://localhost${path}`,
      path,
      header: vi.fn((name: string) => {
        if (name === 'if-none-match') {return ifNoneMatch}
        return undefined
      }),
    },
    get: vi.fn(() => undefined),
  } as unknown as Context<ViteEnv>
}

describe('send', () => {
  describe('basic response', () => {
    it('should return 200 response with content', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js')

      expect(response.status).toBe(200)
    })

    it('should set Content-Type header based on type alias', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js')

      expect(response.headers.get('Content-Type')).toBe('text/javascript')
    })

    it('should set CSS Content-Type for css type', () => {
      const c = createMockContext({ path: '/style.css' })
      const content = '.foo { color: red; }'

      const response = send(c, content, 'css')

      expect(response.headers.get('Content-Type')).toBe('text/css')
    })

    it('should set HTML Content-Type for html type', () => {
      const c = createMockContext({ path: '/index.html' })
      const content = '<html></html>'

      const response = send(c, content, 'html')

      expect(response.headers.get('Content-Type')).toBe('text/html')
    })

    it('should set JSON Content-Type for json type', () => {
      const c = createMockContext({ path: '/data.json' })
      const content = '{"key": "value"}'

      const response = send(c, content, 'json')

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should use raw type if not in alias', () => {
      const c = createMockContext({ path: '/file.xml' })
      const content = '<xml></xml>'

      const response = send(c, content, 'application/xml')

      expect(response.headers.get('Content-Type')).toBe('application/xml')
    })
  })

  describe('cache headers', () => {
    it('should set default Cache-Control to no-cache', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js')

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should use custom Cache-Control from options', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js', {
        cacheControl: 'max-age=31536000,immutable',
      })

      expect(response.headers.get('Cache-Control')).toBe('max-age=31536000,immutable')
    })

    it('should generate and set Etag header', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js')

      expect(response.headers.get('Etag')).toBeTruthy()
      expect(response.headers.get('Etag')).toMatch(/^W\//)
    })

    it('should use custom Etag from options', () => {
      const c = createMockContext()
      const content = 'const x = 1;'
      const customEtag = '"custom-etag-123"'

      const response = send(c, content, 'js', { etag: customEtag })

      expect(response.headers.get('Etag')).toBe(customEtag)
    })
  })

  describe('304 Not Modified', () => {
    it('should return 304 when If-None-Match matches Etag', () => {
      const content = 'const x = 1;'
      const customEtag = '"test-etag"'
      const c = createMockContext({ ifNoneMatch: customEtag })

      const response = send(c, content, 'js', { etag: customEtag })

      expect(response.status).toBe(304)
    })

    it('should return 200 when If-None-Match does not match', () => {
      const content = 'const x = 1;'
      const c = createMockContext({ ifNoneMatch: '"old-etag"' })

      const response = send(c, content, 'js', { etag: '"new-etag"' })

      expect(response.status).toBe(200)
    })
  })

  describe('custom headers', () => {
    it('should add custom headers to response', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      })

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(response.headers.get('X-Another-Header')).toBe('another-value')
    })

    it('should not add undefined header values', () => {
      const c = createMockContext()
      const content = 'const x = 1;'

      const response = send(c, content, 'js', {
        headers: {
          'X-Defined': 'value',
        },
      })

      expect(response.headers.get('X-Defined')).toBe('value')
    })
  })

  describe('sourcemap injection', () => {
    it('should inject sourcemap for JS when map is provided', async () => {
      const c = createMockContext({ path: '/test.js' })
      const content = 'const x = 1;'
      const map: SourceMap = {
        version: 3,
        sources: ['test.js'],
        sourcesContent: ['const x = 1;'],
        names: [],
        mappings: 'AAAA',
      }

      const response = send(c, content, 'js', { map })
      const body = await response.text()

      expect(body).toContain('//# sourceMappingURL=data:application/json;base64,')
    })

    it('should inject sourcemap for CSS when map is provided', async () => {
      const c = createMockContext({ path: '/style.css' })
      const content = '.foo { color: red; }'
      const map: SourceMap = {
        version: 3,
        sources: ['style.css'],
        sourcesContent: ['.foo { color: red; }'],
        names: [],
        mappings: 'AAAA',
      }

      const response = send(c, content, 'css', { map })
      const body = await response.text()

      expect(body).toContain('/*# sourceMappingURL=data:application/json;base64,')
    })

    it('should not inject sourcemap when map has empty mappings', async () => {
      const c = createMockContext({ path: '/test.js' })
      const content = 'const x = 1;'
      const map = { mappings: '' as const }

      const response = send(c, content, 'js', { map })
      const body = await response.text()

      expect(body).toBe(content)
      expect(body).not.toContain('sourceMappingURL=')
    })

    it('should skip sourcemap injection when code has existing inline sourcemap', async () => {
      const c = createMockContext({ path: '/test.js' })
      const existingMap = '//# sourceMappingURL=data:application/json;base64,existing'
      const content = `const x = 1;\n${existingMap}`

      const response = send(c, content, 'js')
      const body = await response.text()

      // Should keep the original sourcemap unchanged
      expect(body).toContain('existing')
    })
  })

  describe('HEAD request', () => {
    it('should return empty body for HEAD request', async () => {
      const c = createMockContext({ method: 'HEAD' })
      const content = 'const x = 1;'

      const response = send(c, content, 'js')
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toBe('')
    })

    it('should include headers for HEAD request', () => {
      const c = createMockContext({ method: 'HEAD' })
      const content = 'const x = 1;'

      const response = send(c, content, 'js')

      expect(response.headers.get('Content-Type')).toBe('text/javascript')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Etag')).toBeTruthy()
    })
  })

  describe('Uint8Array input', () => {
    it('should handle Uint8Array content', async () => {
      const c = createMockContext({ path: '/data.bin' })
      const content = new TextEncoder().encode('binary data')

      const response = send(c, content, 'application/octet-stream')
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toBe('binary data')
    })

    it('should generate consistent etag for same Uint8Array content', () => {
      const c1 = createMockContext({ path: '/data1.bin' })
      const c2 = createMockContext({ path: '/data2.bin' })
      const content = new TextEncoder().encode('same content')

      const response1 = send(c1, content, 'application/octet-stream')
      const response2 = send(c2, content, 'application/octet-stream')

      expect(response1.headers.get('Etag')).toBe(response2.headers.get('Etag'))
    })

    it('should generate different etag for different content', () => {
      const c1 = createMockContext({ path: '/data1.bin' })
      const c2 = createMockContext({ path: '/data2.bin' })
      const content1 = new TextEncoder().encode('content one')
      const content2 = new TextEncoder().encode('content two')

      const response1 = send(c1, content1, 'application/octet-stream')
      const response2 = send(c2, content2, 'application/octet-stream')

      expect(response1.headers.get('Etag')).not.toBe(response2.headers.get('Etag'))
    })
  })
})
