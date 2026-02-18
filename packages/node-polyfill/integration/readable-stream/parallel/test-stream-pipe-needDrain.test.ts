import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-needDrain', () => {
  // Pipe should pause temporarily if writable needs drain.
  it('should pause when writable needs drain', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_buf: Buffer, _encoding: string, callback: () => void) {
          process.nextTick(callback)
        },
        highWaterMark: 1
      })
      while (w.write('asd')) {}
      expect((w as any).writableNeedDrain).toBe(true)

      const r = new Readable({
        read() {
          this.push('asd')
          this.push(null)
        }
      })
      r.on('pause', mustCall(2) as (...args: unknown[]) => void)
      r.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.pipe(w)
    }))
})
