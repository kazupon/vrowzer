import { Writable } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-writable-constructor-set-methods', () => {
  it('should throw ERR_METHOD_NOT_IMPLEMENTED when _write is not set', () => {
    const bufferBlerg = Buffer.from('blerg')
    const w = new Writable()
    expect(() => {
      w.end(bufferBlerg)
    }).toThrow(
      expect.objectContaining({
        name: 'Error',
        code: 'ERR_METHOD_NOT_IMPLEMENTED',
        message: 'The _write() method is not implemented'
      })
    )
  })

  it('should support write and writev methods via constructor options', () =>
    new Promise<void>(resolve => {
      const bufferBlerg = Buffer.from('blerg')
      const _write = mustCall((_chunk: unknown, _: unknown, next: () => void) => {
        next()
      }) as (...args: unknown[]) => void
      const _writev = mustCall((chunks: unknown[], next: () => void) => {
        expect(chunks.length).toBe(2)
        next()
        resolve()
      }) as (...args: unknown[]) => void
      const w2 = new Writable({
        write: _write as unknown as (
          chunk: unknown,
          encoding: string,
          callback: (error?: Error | null) => void
        ) => void,
        writev: _writev as unknown as (
          chunks: Array<{ chunk: unknown; encoding: string }>,
          callback: (error?: Error | null) => void
        ) => void
      })
      expect(w2._write).toBe(_write)
      expect(w2._writev).toBe(_writev)
      w2.write(bufferBlerg)
      w2.cork()
      w2.write(bufferBlerg)
      w2.write(bufferBlerg)
      w2.end()
    }))
})
