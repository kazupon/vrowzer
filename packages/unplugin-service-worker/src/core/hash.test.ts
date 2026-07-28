import { describe, expect, test } from 'vite-plus/test'
import { hash } from './hash.ts'

describe('hash', () => {
  test('returns a string', () => {
    expect(typeof hash('hello')).toBe('string')
  })

  test('returns consistent results for the same input', () => {
    expect(hash('foo')).toBe(hash('foo'))
  })

  test('returns different results for different inputs', () => {
    expect(hash('foo')).not.toBe(hash('bar'))
  })

  test('returns alphanumeric string (base36)', () => {
    expect(hash('test')).toMatch(/^[0-9a-z]+$/)
  })

  test('truncates to 8 characters max', () => {
    expect(hash('short').length).toBeLessThanOrEqual(8)
    expect(hash('/very/long/absolute/path/to/some/file.ts').length).toBeLessThanOrEqual(8)
  })

  test('handles empty string', () => {
    expect(hash('')).toBe('0')
  })

  test('handles file paths', () => {
    const h = hash('/Users/me/project/src/service-worker.ts')
    expect(h).toBeTruthy()
    expect(h.length).toBeGreaterThan(0)
    expect(h.length).toBeLessThanOrEqual(8)
  })
})
