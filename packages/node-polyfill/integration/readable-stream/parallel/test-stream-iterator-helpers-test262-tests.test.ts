import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

// These tests are manually ported from the draft PR for the test262 test suite
// Authored by Rick Waldron in https://github.com/tc39/test262/pull/2818/files

describe('test-stream-iterator-helpers-test262-tests', () => {
  describe('asIndexedPairs', () => {
    it('is a function', () => {
      expect(typeof Readable.prototype.asIndexedPairs).toBe('function')
    })

    it('indexed-pairs', async () => {
      const iterator = Readable.from([0, 1])
      const indexedPairs = iterator.asIndexedPairs()

      for await (const [i, v] of indexedPairs) {
        expect(i).toBe(v)
      }
    })

    it('length', () => {
      expect(Readable.prototype.asIndexedPairs.length).toBe(0)
      const descriptor = Object.getOwnPropertyDescriptor(Readable.prototype, 'asIndexedPairs')
      expect(descriptor!.enumerable).toBe(false)
      expect(descriptor!.configurable).toBe(true)
      expect(descriptor!.writable).toBe(true)
    })
  })

  describe('drop', () => {
    it('length and property descriptor', () => {
      expect(Readable.prototype.drop.length).toBe(1)
      const descriptor = Object.getOwnPropertyDescriptor(Readable.prototype, 'drop')
      expect(descriptor!.enumerable).toBe(false)
      expect(descriptor!.configurable).toBe(true)
      expect(descriptor!.writable).toBe(true)
    })

    it('limit-equals-total', async () => {
      const iterator = Readable.from([1, 2]).drop(2)
      const result = await iterator[Symbol.asyncIterator]().next()
      expect(result).toEqual({ done: true, value: undefined })
    })

    it('limit-greater-than-total', async () => {
      const iterator2 = Readable.from([1, 2]).drop(3)
      const result2 = await iterator2[Symbol.asyncIterator]().next()
      expect(result2).toEqual({ done: true, value: undefined })
    })

    it('limit-less-than-total', async () => {
      const iterator3 = Readable.from([1, 2]).drop(1)
      const result3 = await iterator3[Symbol.asyncIterator]().next()
      expect(result3).toEqual({ done: false, value: 2 })
    })

    it('limit-rangeerror', () => {
      expect(() => Readable.from([1]).drop(-1)).toThrow(RangeError)
      expect(() => {
        Readable.from([1]).drop({
          valueOf() {
            throw new Error('boom')
          }
        } as unknown as number)
      }).toThrow(/boom/)
    })

    it('limit-tointeger', async () => {
      const two = await Readable.from([1, 2])
        .drop({ valueOf: () => 1 } as unknown as number)
        .toArray()
      expect(two).toEqual([2])
    })

    it('name', () => {
      expect(Readable.prototype.drop.name).toBe('drop')
    })

    it('non-constructible', () => {
      expect(
        () => new (Readable.prototype.drop as unknown as new (n: number) => unknown)(1)
      ).toThrow(TypeError)
    })

    it('proto', () => {
      const proto = Object.getPrototypeOf(Readable.prototype.drop)
      expect(proto).toBe(Function.prototype)
    })
  })

  describe('every', () => {
    it('abrupt-iterator-close', async () => {
      const stream = Readable.from([1, 2, 3])
      const e = new Error()
      await expect(
        stream.every(
          // @ts-ignore - mustCall return type mismatch
          mustCall(() => {
            throw e
          }, 1) as any
        )
      ).rejects.toThrow()
    })

    it('callable-fn', async () => {
      await expect(Readable.from([1, 2]).every({} as unknown as () => boolean)).rejects.toThrow(
        TypeError
      )
    })

    it('callable', () => {
      // @ts-ignore - testing callable with void return
      Readable.prototype.every.call(Readable.from([]), () => {})
      // @ts-ignore - testing callable with void return
      Readable.from([]).every(() => {})
      expect(() => {
        const r = Readable.from([])
        new (r.every as unknown as new (fn: () => void) => unknown)(() => {})
      }).toThrow(TypeError)
    })

    it('false', async () => {
      const iterator = Readable.from([1, 2, 3])
      const result = await iterator.every((v: number) => v === 1)
      expect(result).toBe(false)
    })

    it('every returns true', async () => {
      const iterator = Readable.from([1, 2, 3])
      const result = await iterator.every((_v: unknown) => true)
      expect(result).toBe(true)
    })

    it('is-function', () => {
      expect(typeof Readable.prototype.every).toBe('function')
    })

    it('length, name, and property descriptor', () => {
      expect(Readable.prototype.every.length).toBe(1)
      expect(Readable.prototype.every.name).toBe('every')
      const descriptor = Object.getOwnPropertyDescriptor(Readable.prototype, 'every')
      expect(descriptor!.enumerable).toBe(false)
      expect(descriptor!.configurable).toBe(true)
      expect(descriptor!.writable).toBe(true)
    })
  })
})
