import { describe, expect, it } from 'vitest'
import {
  _extend,
  deprecate,
  format,
  formatWithOptions,
  inspect,
  promisify,
  stripVTControlCharacters
} from './util.ts'

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

// Tests based on refers/node/test/parallel/test-util-format.js
describe('format', () => {
  it('should return empty string with no arguments', () => {
    expect(format()).toBe('')
  })

  it('should return empty string for empty string arg', () => {
    expect(format('')).toBe('')
  })

  it('should format non-string values', () => {
    expect(format([])).toContain('[]')
    expect(format(null)).toBe('null')
    expect(format(true)).toBe('true')
    expect(format(false)).toBe('false')
  })

  it('should join extra arguments with space', () => {
    expect(format('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should handle %s format specifier', () => {
    expect(format('%s', 'hello')).toBe('hello')
    expect(format('test %s', 'value')).toBe('test value')
  })

  it('should handle Symbol with %s', () => {
    const symbol = Symbol('foo')
    expect(format('%s', symbol)).toBe('Symbol(foo)')
  })

  it('should handle %d format specifier', () => {
    expect(format('%d', 42.0)).toBe('42')
    expect(format('%d', '42')).toBe('42')
  })

  it('should handle %i format specifier', () => {
    expect(format('%i', 42.5)).toBe('42')
    expect(format('%i', -42.5)).toBe('-42')
  })

  it('should handle %j format specifier', () => {
    expect(format('%j', { a: 1 })).toBe('{"a":1}')
    expect(format('%j', [1, 2])).toBe('[1,2]')
  })

  it('should handle %% escape', () => {
    expect(format('%%')).toBe('%')
    expect(format('100%%')).toBe('100%')
  })

  it('should handle missing format arguments', () => {
    expect(format('%s')).toBe('%s')
    expect(format('%d')).toBe('%d')
  })

  it('should handle extra arguments after format string', () => {
    expect(format('%s', 'a', 'b')).toBe('a b')
  })

  it('should handle multiple format specifiers', () => {
    expect(format('%s is %d', 'age', 42)).toBe('age is 42')
  })
})

describe('formatWithOptions', () => {
  it('should format like format() ignoring options', () => {
    expect(formatWithOptions({}, '%s', 'test')).toBe('test')
    expect(formatWithOptions({ colors: true }, 'hello %s', 'world')).toBe('hello world')
  })
})

// Tests based on refers/node/test/parallel/test-util-deprecate.js
describe('deprecate', () => {
  it('should return a function', () => {
    const fn = () => 42
    const deprecated = deprecate(fn, 'deprecated')
    expect(typeof deprecated).toBe('function')
  })

  it('should preserve function behavior', () => {
    const fn = (a: number, b: number) => a + b
    const deprecated = deprecate(fn, 'deprecated')
    expect(deprecated(1, 2)).toBe(3)
  })

  it('should preserve function length', () => {
    const fn = (_a: number, _b: number, _c: number) => {}
    const deprecated = deprecate(fn, 'deprecated')
    expect(deprecated.length).toBe(fn.length)
  })
})

describe('_extend', () => {
  it('should copy properties from source to target', () => {
    const result = _extend({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should override existing properties', () => {
    const result = _extend({ a: 1 }, { a: 2 })
    expect(result).toEqual({ a: 2 })
  })

  it('should return the target object', () => {
    const target = { a: 1 }
    const result = _extend(target, { b: 2 })
    expect(result).toBe(target)
  })
})
