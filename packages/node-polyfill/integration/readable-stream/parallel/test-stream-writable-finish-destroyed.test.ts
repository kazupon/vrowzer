import { describe, it } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writable-finish-destroyed', () => {
  it('no finish after end then destroy with write pending', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write: mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
          w.on(
            'close',
            mustCall(() => {
              cb()
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
      w.end('asd')
      w.destroy()
    }))

  it('no finish after write then destroy with write pending', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write: mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
          w.on(
            'close',
            mustCall(() => {
              cb()
              w.end()
              resolve()
            }) as (...args: unknown[]) => void
          )
        }) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
      w.write('asd')
      w.destroy()
    }))

  it('no finish after end then destroy without data', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write() {}
      })
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
      w.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.end()
      w.destroy()
    }))
})
