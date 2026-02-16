import { describe, expect, it } from 'vitest'
import { generateEtag } from './utils'

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
