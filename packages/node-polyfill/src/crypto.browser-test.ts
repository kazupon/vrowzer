/**
 * Tests for node:crypto polyfill.
 * Based on refers/node/test/parallel/test-crypto-hash.js
 */
import { describe, expect, it } from 'vite-plus/test'
import { createHash, hash, randomBytes, randomUUID } from './crypto.ts'

describe('createHash', () => {
  it('should create a sha256 hash with hex digest', () => {
    const result = createHash('sha256').update('Test123').digest('hex')
    expect(typeof result).toBe('string')
    expect(result).toHaveLength(64) // SHA-256 hex = 64 chars
  })

  it('should create a sha256 hash with base64 digest', () => {
    const result = createHash('sha256').update('Test123').digest('base64')
    expect(typeof result).toBe('string')
    // Base64 of 32 bytes = 44 chars
    expect((result as string).length).toBeGreaterThan(0)
  })

  it('should return Uint8Array when no encoding is specified', () => {
    const result = createHash('sha256').update('Test123').digest()
    expect(result).toBeInstanceOf(Uint8Array)
    expect((result as Uint8Array).length).toBe(32) // SHA-256 = 32 bytes
  })

  it('should return Uint8Array with buffer encoding', () => {
    const result = createHash('sha256').update('Test123').digest('buffer')
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('should produce consistent hashes for the same input', () => {
    const a = createHash('sha256').update('Test123').digest('hex')
    const b = createHash('sha256').update('Test123').digest('hex')
    expect(a).toBe(b)
  })

  it('should produce different hashes for different inputs', () => {
    const a = createHash('sha256').update('Test123').digest('hex')
    const b = createHash('sha256').update('Test456').digest('hex')
    expect(a).not.toBe(b)
  })

  it('should support chained updates', () => {
    const a = createHash('sha256').update('Test').update('123').digest('hex')
    const b = createHash('sha256').update('Test123').digest('hex')
    expect(a).toBe(b)
  })

  it('should handle empty input', () => {
    const result = createHash('sha256').update('').digest('hex')
    expect(typeof result).toBe('string')
    expect(result).toHaveLength(64)
    // SHA-256 of empty string is known: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('should produce correct sha256 hash for known input', () => {
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const result = createHash('sha256').update('hello').digest('hex')
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('should fallback unsupported algorithms to sha256', () => {
    // md5 is not natively supported, falls back to sha256
    const result = createHash('md5').update('Test123').digest('hex')
    expect(typeof result).toBe('string')
    expect(result).toHaveLength(64) // Still produces 64-char hex (sha256)
  })
})

describe('hash', () => {
  it('should compute hash in one shot', () => {
    const result = hash('sha256', 'Test123', 'hex')
    const expected = createHash('sha256').update('Test123').digest('hex')
    expect(result).toBe(expected)
  })

  it('should default to hex encoding', () => {
    const result = hash('sha256', 'Test123')
    expect(typeof result).toBe('string')
    expect(result).toHaveLength(64)
  })

  it('should support base64 encoding', () => {
    const result = hash('sha256', 'Test123', 'base64')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('randomUUID', () => {
  it('should return a valid UUID v4 string', () => {
    const uuid = randomUUID()
    expect(uuid).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
  })

  it('should return unique values', () => {
    const a = randomUUID()
    const b = randomUUID()
    expect(a).not.toBe(b)
  })
})

describe('randomBytes', () => {
  it('should return Uint8Array of specified size', () => {
    const bytes = randomBytes(16)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(16)
  })

  it('should return different values each time', () => {
    const a = randomBytes(16)
    const b = randomBytes(16)
    // Extremely unlikely to be equal
    expect(a).not.toEqual(b)
  })
})
