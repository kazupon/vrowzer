import crypto from 'node:crypto'
import { describe, expect, it } from 'vite-plus/test'
import { getHash } from './utils'

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
