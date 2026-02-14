import { describe, expect, it } from 'vitest'
import { inspect, promisify, stripVTControlCharacters } from './util.ts'

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

describe('inspect', () => {
  it('should return string representation of an object', () => {
    const result = inspect({ a: 1, b: 'hello' })
    expect(result).toContain('"a": 1')
    expect(result).toContain('"b": "hello"')
  })

  it('should handle arrays', () => {
    const result = inspect([1, 2, 3])
    expect(result).toContain('1')
    expect(result).toContain('2')
    expect(result).toContain('3')
  })

  it('should handle primitive values', () => {
    expect(inspect(42)).toBe('42')
    expect(inspect('hello')).toBe('"hello"')
    expect(inspect(true)).toBe('true')
    expect(inspect(null)).toBe('null')
  })

  it('should handle undefined', () => {
    const result = inspect(undefined)
    expect(result).toBe('undefined')
  })

  it('should handle circular references without throwing', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(() => inspect(obj)).not.toThrow()
  })
})

describe('stripVTControlCharacters', () => {
  it('should remove ANSI color codes', () => {
    const input = '\u001B[31mError\u001B[0m'
    expect(stripVTControlCharacters(input)).toBe('Error')
  })

  it('should remove bold formatting', () => {
    const input = '\u001B[1mBold\u001B[22m'
    expect(stripVTControlCharacters(input)).toBe('Bold')
  })

  it('should handle multiple ANSI codes', () => {
    const input = '\u001B[31m\u001B[1mRed Bold\u001B[22m\u001B[0m text'
    expect(stripVTControlCharacters(input)).toBe('Red Bold text')
  })

  it('should pass through plain text unchanged', () => {
    const input = 'Hello, world!'
    expect(stripVTControlCharacters(input)).toBe('Hello, world!')
  })

  it('should handle empty string', () => {
    expect(stripVTControlCharacters('')).toBe('')
  })

  it('should remove cursor movement codes', () => {
    const input = '\u001B[2Ahello\u001B[K'
    expect(stripVTControlCharacters(input)).toBe('hello')
  })

  it('should remove 256-color codes', () => {
    const input = '\u001B[38;5;196mred\u001B[0m'
    expect(stripVTControlCharacters(input)).toBe('red')
  })
})
