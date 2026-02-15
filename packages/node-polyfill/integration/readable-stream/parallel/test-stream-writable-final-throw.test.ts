import { describe, it } from 'vitest'
import { mustCall, expectsError } from '../common/index.ts'
import { Duplex } from 'readable-stream'

describe('test-stream-writable-final-throw', () => {
  it('_final that throws emits error', () =>
    new Promise<void>(resolve => {
      class Foo extends Duplex {
        _final(_callback: (err?: Error | null) => void) {
          throw new Error('fhqwhgads')
        }
        _read() {}
      }
      const foo = new Foo()
      foo._write = mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
        cb()
      }) as (chunk: unknown, encoding: string, cb: () => void) => void
      foo.end('test', (...args: unknown[]) => {
        ;(expectsError({ message: 'fhqwhgads' }) as Function)(...args)
      })
      foo.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
