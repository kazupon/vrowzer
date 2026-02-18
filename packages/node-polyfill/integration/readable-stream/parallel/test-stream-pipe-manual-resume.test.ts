import { describe, it } from 'vitest'
import { mustCall, mustCallAtLeast } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-manual-resume', () => {
  function test(throwCodeInbetween: (rs: Readable, ws: Writable) => void) {
    // Check that a pipe does not stall if .read() is called unexpectedly
    // (i.e. the stream is not resumed by the pipe).
    return new Promise<void>(resolve => {
      const n = 1000
      let counter = n
      const rs = new Readable({
        objectMode: true,
        read: mustCallAtLeast(() => {
          if (--counter >= 0) {
            rs.push({ counter })
          } else {
            rs.push(null)
          }
        }, n) as (...args: unknown[]) => void
      })
      const ws = new Writable({
        objectMode: true,
        write: mustCall((_data: unknown, _enc: string, cb: () => void) => {
          setImmediate(cb)
        }, n) as (...args: unknown[]) => void
      })
      ws.on('finish', () => {
        resolve()
      })
      setImmediate(() => throwCodeInbetween(rs, ws))
      rs.pipe(ws)
    })
  }

  it('should not stall when read() is called', () => test(rs => rs.read()))
  it('should not stall when resume() is called', () => test(rs => rs.resume()))
  it('should not stall with no-op', () => test(() => 0))
})
