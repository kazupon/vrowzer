import { describe, expect, it } from 'vitest'
import { fileURLToPath, pathToFileURL, isWindows, promisify, generateEtag } from './utils'

describe('fileURLToPath', () => {
  it('should convert file URL string to path', () => {
    const result = fileURLToPath('file:///foo/bar/test.js')
    expect(result).toBe('/foo/bar/test.js')
  })

  it('should convert file URL object to path', () => {
    const url = new URL('file:///foo/bar/test.js')
    const result = fileURLToPath(url)
    expect(result).toBe('/foo/bar/test.js')
  })

  it('should decode percent-encoded characters', () => {
    const result = fileURLToPath('file:///foo/bar/test%20file.js')
    expect(result).toBe('/foo/bar/test file.js')
  })

  it('should decode unicode characters', () => {
    const result = fileURLToPath('file:///foo/bar/%E3%83%86%E3%82%B9%E3%83%88.js')
    expect(result).toBe('/foo/bar/テスト.js')
  })

  it('should handle root path', () => {
    const result = fileURLToPath('file:///')
    expect(result).toBe('/')
  })

  it('should handle path with query string', () => {
    const url = new URL('file:///foo/bar/test.js?query=1')
    const result = fileURLToPath(url)
    expect(result).toBe('/foo/bar/test.js')
  })

  it('should handle path with hash', () => {
    const url = new URL('file:///foo/bar/test.js#section')
    const result = fileURLToPath(url)
    expect(result).toBe('/foo/bar/test.js')
  })

  it('should throw for non-file protocol', () => {
    expect(() => fileURLToPath('https://example.com/path')).toThrow(
      'The URL must be of scheme file'
    )
  })

  it('should throw for http URL object', () => {
    const url = new URL('http://example.com/path')
    expect(() => fileURLToPath(url)).toThrow('The URL must be of scheme file')
  })

  // Windows-specific tests (only run conceptually, since isWindows is false in test env)
  describe('Windows paths (when isWindows = true)', () => {
    it('should handle Windows drive letter path format', () => {
      // This test documents the expected behavior for Windows
      // file:///C:/path/to/file -> C:/path/to/file (on Windows)
      // file:///C:/path/to/file -> /C:/path/to/file (on non-Windows)
      const result = fileURLToPath('file:///C:/Users/test/file.js')
      if (isWindows) {
        expect(result).toBe('C:/Users/test/file.js')
      } else {
        expect(result).toBe('/C:/Users/test/file.js')
      }
    })
  })
})

describe('pathToFileURL', () => {
  it('should convert absolute path to file URL', () => {
    const result = pathToFileURL('/foo/bar/test.js')
    expect(result.href).toBe('file:///foo/bar/test.js')
    expect(result.protocol).toBe('file:')
  })

  it('should encode special characters', () => {
    const result = pathToFileURL('/foo/bar/test file.js')
    expect(result.href).toBe('file:///foo/bar/test%20file.js')
  })

  it('should encode unicode characters', () => {
    const result = pathToFileURL('/foo/bar/テスト.js')
    expect(result.href).toContain('file:///foo/bar/')
    // URL encoding for テスト
    expect(result.pathname).toBe('/foo/bar/%E3%83%86%E3%82%B9%E3%83%88.js')
  })

  it('should handle root path', () => {
    const result = pathToFileURL('/')
    expect(result.href).toBe('file:///')
  })

  it('should add leading slash for relative paths', () => {
    const result = pathToFileURL('foo/bar/test.js')
    expect(result.pathname).toBe('/foo/bar/test.js')
  })

  it('should return URL object', () => {
    const result = pathToFileURL('/test.js')
    expect(result).toBeInstanceOf(URL)
  })

  // Windows-specific tests
  describe('Windows paths (when isWindows = true)', () => {
    it('should handle Windows absolute path format', () => {
      // This test documents expected behavior
      // On Windows: C:\Users\test -> file:///C:/Users/test
      // On non-Windows: paths don't use backslashes
      const result = pathToFileURL('/C:/Users/test/file.js')
      expect(result.protocol).toBe('file:')
      expect(result.pathname).toContain('C:/Users/test/file.js')
    })
  })
})

describe('fileURLToPath and pathToFileURL roundtrip', () => {
  it('should roundtrip simple path', () => {
    const originalPath = '/foo/bar/test.js'
    const url = pathToFileURL(originalPath)
    const result = fileURLToPath(url)
    expect(result).toBe(originalPath)
  })

  it('should roundtrip path with spaces', () => {
    const originalPath = '/foo/bar/test file.js'
    const url = pathToFileURL(originalPath)
    const result = fileURLToPath(url)
    expect(result).toBe(originalPath)
  })

  it('should roundtrip path with unicode', () => {
    const originalPath = '/foo/bar/テスト.js'
    const url = pathToFileURL(originalPath)
    const result = fileURLToPath(url)
    expect(result).toBe(originalPath)
  })

  it('should roundtrip deeply nested path', () => {
    const originalPath = '/a/b/c/d/e/f/g/h/test.js'
    const url = pathToFileURL(originalPath)
    const result = fileURLToPath(url)
    expect(result).toBe(originalPath)
  })
})

describe('generateEtag', () => {
  it('should generate a weak etag by default', () => {
    const etag = generateEtag('hello')
    expect(etag).toMatch(/^W\/"[0-9a-f]+-[0-9a-z]+"$/)
  })

  it('should generate a strong etag when weak is false', () => {
    const etag = generateEtag('hello', { weak: false })
    expect(etag).toMatch(/^"[0-9a-f]+-[0-9a-z]+"$/)
    expect(etag).not.toMatch(/^W\//)
  })

  it('should return consistent results for the same input', () => {
    const etag1 = generateEtag('hello world')
    const etag2 = generateEtag('hello world')
    expect(etag1).toBe(etag2)
  })

  it('should return different results for different inputs', () => {
    const etag1 = generateEtag('hello')
    const etag2 = generateEtag('world')
    expect(etag1).not.toBe(etag2)
  })

  it('should handle empty string', () => {
    const etag = generateEtag('')
    expect(etag).toBe('W/"0-0"')
  })

  it('should handle empty string with strong etag', () => {
    const etag = generateEtag('', { weak: false })
    expect(etag).toBe('"0-0"')
  })

  it('should handle Uint8Array input', () => {
    const bytes = new TextEncoder().encode('hello')
    const etag = generateEtag(bytes)
    expect(etag).toMatch(/^W\/"[0-9a-f]+-[0-9a-z]+"$/)
  })

  it('should produce the same etag for string and its Uint8Array equivalent', () => {
    const str = 'hello world'
    const bytes = new TextEncoder().encode(str)
    expect(generateEtag(str)).toBe(generateEtag(bytes))
  })

  it('should handle empty Uint8Array', () => {
    const etag = generateEtag(new Uint8Array(0))
    expect(etag).toBe('W/"0-0"')
  })

  it('should include content length in hex in the etag', () => {
    const content = 'abc' // 3 bytes -> "3" in hex
    const etag = generateEtag(content, { weak: false })
    expect(etag).toMatch(/^"3-/)
  })

  it('should handle multi-byte characters correctly', () => {
    const content = 'あ' // 3 bytes in UTF-8
    const etag = generateEtag(content, { weak: false })
    expect(etag).toMatch(/^"3-/)
  })

  it('should handle large content', () => {
    const content = 'a'.repeat(100000)
    const etag = generateEtag(content)
    expect(etag).toMatch(/^W\/"[0-9a-f]+-[0-9a-z]+"$/)
  })
})

describe('promisify', () => {
  it('should resolve with the result on success', async () => {
    const fn = (a: number, b: number, cb: (err: unknown, result: number) => void) => {
      cb(null, a + b)
    }
    const promisified = promisify(fn)
    const result = await promisified(1, 2)
    expect(result).toBe(3)
  })

  it('should reject with the error on failure', async () => {
    const fn = (_a: string, cb: (err: unknown, result: string) => void) => {
      cb(new Error('fail'), '' as never)
    }
    const promisified = promisify(fn)
    await expect(promisified('test')).rejects.toThrow('fail')
  })

  it('should work with no extra arguments', async () => {
    const fn = (cb: (err: unknown, result: string) => void) => {
      cb(null, 'hello')
    }
    const promisified = promisify(fn)
    const result = await promisified()
    expect(result).toBe('hello')
  })

  it('should handle async callback', async () => {
    const fn = (value: string, cb: (err: unknown, result: string) => void) => {
      setTimeout(() => cb(null, value.toUpperCase()), 10)
    }
    const promisified = promisify(fn)
    const result = await promisified('test')
    expect(result).toBe('TEST')
  })
})
