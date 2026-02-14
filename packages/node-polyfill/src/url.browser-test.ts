import { describe, expect, it } from 'vitest'
import { URL as ExportedURL, fileURLToPath, pathToFileURL } from './url.ts'

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

describe('URL re-export', () => {
  it('should re-export the global URL constructor', () => {
    expect(ExportedURL).toBe(globalThis.URL)
  })

  it('should be usable as a constructor', () => {
    const url = new ExportedURL('https://example.com/path')
    expect(url.hostname).toBe('example.com')
    expect(url.pathname).toBe('/path')
  })
})
