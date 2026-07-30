import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vite-plus/test'
import {
  flattenId,
  getFileStartIndex,
  getHash,
  mergeConfig,
  setupHmrWsOptionCompat,
} from './utils'

describe('getHash', () => {
  function cryptoHash(text: string, length = 8): string {
    const h = crypto.hash('sha256', text, 'hex').substring(0, length)
    if (length <= 64) {return h}
    return h.padEnd(length, '_')
  }

  it('should return the same result as crypto.hash for a simple string', () => {
    const text = 'hello world'
    expect(getHash(text)).toBe(cryptoHash(text))
  })

  it('should return the same result as crypto.hash for various inputs', () => {
    const inputs = ['', 'test', 'vite-dev-server', '日本語テキスト']
    for (const text of inputs) {
      expect(getHash(text)).toBe(cryptoHash(text))
    }
  })

  it('should return the same result as crypto.hash with custom length', () => {
    const text = 'some content to hash'
    for (const length of [4, 8, 16, 32, 64]) {
      expect(getHash(text, length)).toBe(cryptoHash(text, length))
    }
  })

  it('should pad with underscores when length exceeds 64', () => {
    const text = 'pad test'
    const length = 80
    expect(getHash(text, length)).toBe(cryptoHash(text, length))
  })
})

describe('flattenId', () => {
  it('should replace + symbols in package subpath exports', () => {
    const id = 'ravelinjs/core+track+encrypt+promise'
    const result = flattenId(id)

    expect(result).not.toContain('+')
    expect(result).toBe('ravelinjs_core_02b_track_02b_encrypt_02b_promise')
  })

  it('escapes underscores', () => {
    expect(flattenId('foo_bar')).toBe('foo___bar')
    expect(flattenId('foo__bar')).toBe('foo____bar')
    expect(flattenId('foo___bar')).toBe('foo_____bar')
    expect(flattenId('foo____bar')).toBe('foo______bar')
  })

  it('escapes slashes', () => {
    expect(flattenId('foo/bar')).toBe('foo_bar')
  })

  it('escapes dots', () => {
    expect(flattenId('foo.bar')).toBe('foo__bar')
  })

  it('escapes invalid URL path characters', () => {
    expect(flattenId('foo#bar')).toBe('foo_023_bar')
    expect(flattenId('foo$bar')).toBe('foo_024_bar')
    expect(flattenId('foo*bar')).toBe('foo_02a_bar')
    expect(flattenId('foo+bar')).toBe('foo_02b_bar')
  })

  it('escapes nested IDs', () => {
    expect(flattenId('foo>bar')).toBe('foo_n_bar')
    expect(flattenId('foo >bar')).toBe('foo_n_bar')
    expect(flattenId('foo> bar')).toBe('foo_n_bar')
    expect(flattenId('foo > bar')).toBe('foo_n_bar')
  })
})

describe('getFileStartIndex', () => {
  it('returns zero without a hashbang', () => {
    expect(getFileStartIndex('console.log("hello")\n')).toBe(0)
  })

  it('returns the first index after a hashbang', () => {
    const hashbang = '#!/usr/bin/env node\n'

    expect(getFileStartIndex(`${hashbang}console.log("hello")\n`)).toBe(
      hashbang.length,
    )
  })
})

describe('server hmr/ws option compatibility', () => {
  it('syncs deprecated server.hmr connection options to server.ws', () => {
    const customServer = {}
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })

    const merged = mergeConfig(
      {
        server: {
          ws: {},
        },
      },
      {
        server: {
          hmr: {
            protocol: 'wss',
            host: 'example.com',
            port: 3001,
            clientPort: 443,
            path: '/ws',
            timeout: 60_000,
            overlay: false,
            server: customServer,
          },
        },
      },
    )

    expect(merged.server.ws).toStrictEqual({
      protocol: 'wss',
      host: 'example.com',
      port: 3001,
      clientPort: 443,
      path: '/ws',
      timeout: 60_000,
      server: customServer,
    })
    expect(merged.server.hmr).toMatchObject({
      protocol: 'wss',
      host: 'example.com',
      port: 3001,
      clientPort: 443,
      path: '/ws',
      timeout: 60_000,
      overlay: false,
      server: customServer,
    })
    expect(merged.server.ws.overlay).toBeUndefined()

    warn.mockRestore()
  })

  it('lets later deprecated options override existing server.ws options', () => {
    const merged = mergeConfig(
      {
        server: {
          ws: {
            host: 'old-host.example.com',
            port: 3001,
          },
        },
      },
      {
        server: {
          hmr: {
            host: 'new-host.example.com',
            port: 3002,
          },
        },
      },
    )

    expect(merged.server.ws.host).toBe('new-host.example.com')
    expect(merged.server.hmr.host).toBe('new-host.example.com')
    expect(merged.server.ws.port).toBe(3002)
    expect(merged.server.hmr.port).toBe(3002)
  })

  it('keeps server.hmr.overlay separate from server.ws', () => {
    const merged = mergeConfig(
      {},
      {
        server: {
          hmr: {
            overlay: false,
          },
        },
      },
    )

    expect(merged.server.hmr.overlay).toBe(false)
    expect(merged.server.ws?.overlay).toBeUndefined()
  })

  it('normalizes standalone server options and keeps aliases synchronized', () => {
    const server = {
      hmr: {
        host: 'legacy.example.com',
        port: 4000,
        overlay: false,
      },
      ws: {
        timeout: 12_345,
      },
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })

    setupHmrWsOptionCompat(server)

    expect(server.ws).toMatchObject({
      host: 'legacy.example.com',
      port: 4000,
      timeout: 12_345,
    })
    expect(server.hmr).toMatchObject({
      host: 'legacy.example.com',
      port: 4000,
      overlay: false,
    })

    server.hmr.host = 'updated.example.com'
    expect(server.ws.host).toBe('updated.example.com')
    expect(server.hmr.host).toBe('updated.example.com')

    warn.mockRestore()
  })
})
