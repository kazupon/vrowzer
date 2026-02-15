import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writable-end-cb-uncaught', () => {
  it('end callback receives error from _final', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      const _err = new Error('kaboom')
      writable._write = (_chunk, _encoding, cb) => {
        cb()
      }
      writable._final = cb => {
        cb(_err)
      }
      writable.on(
        'error',
        mustCall((err: Error) => {
          expect(err.message).toBe('kaboom')
        }) as (...args: unknown[]) => void
      )
      writable.write('asd')
      writable.end(
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
