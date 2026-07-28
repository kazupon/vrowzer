import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Duplex } from 'readable-stream'

describe('test-stream-writable-final-async', () => {
  it('async _final with delay calls callback', () =>
    new Promise<void>(resolve => {
      class Foo extends Duplex {
        async _final(callback: (err?: Error | null) => void) {
          await new Promise(resolve => setTimeout(resolve, 1))
          callback()
        }
        _read() {}
      }
      const foo = new Foo()
      foo._write = mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
        cb()
      }) as (chunk: unknown, encoding: string, cb: () => void) => void
      foo.end(
        'test',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      foo.on('error', mustNotCall() as (...args: unknown[]) => void)
    }))
})
