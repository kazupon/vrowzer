import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable, PassThrough } from 'readable-stream'

describe('test-stream-pipe-flow', () => {
  it('should handle objectMode readable piped to low hwm writable', () =>
    new Promise<void>(resolve => {
      let ticks = 17
      const rs = new Readable({
        objectMode: true,
        read: () => {
          if (ticks-- > 0) return process.nextTick(() => rs.push({}))
          rs.push({})
          rs.push(null)
        }
      })
      const ws = new Writable({
        highWaterMark: 0,
        objectMode: true,
        write: (_data: unknown, _end: string, cb: () => void) => setImmediate(cb)
      })
      rs.on('end', mustCall() as (...args: unknown[]) => void)
      ws.on(
        'finish',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      rs.pipe(ws)
    }))

  it('should handle piped PassThrough chain with wrapper', () =>
    new Promise<void>(resolve => {
      let missing = 8
      const rs = new Readable({
        objectMode: true,
        read: () => {
          if (missing--) rs.push({})
          else rs.push(null)
        }
      })
      const pt = rs
        .pipe(
          new PassThrough({
            objectMode: true,
            highWaterMark: 2
          })
        )
        .pipe(
          new PassThrough({
            objectMode: true,
            highWaterMark: 2
          })
        )
      pt.on('end', () => {
        wrapper.push(null)
      })
      const wrapper = new Readable({
        objectMode: true,
        read: () => {
          process.nextTick(() => {
            let data = pt.read()
            if (data === null) {
              pt.once('readable', () => {
                data = pt.read()
                if (data !== null) wrapper.push(data)
              })
            } else {
              wrapper.push(data)
            }
          })
        }
      })
      wrapper.resume()
      wrapper.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should only register drain if there is backpressure', () =>
    new Promise<void>(resolve => {
      const rs = new Readable({
        read() {}
      })
      const pt = rs.pipe(
        new PassThrough({
          objectMode: true,
          highWaterMark: 2
        })
      )
      expect(pt.listenerCount('drain')).toBe(0)
      pt.on('finish', () => {
        expect(pt.listenerCount('drain')).toBe(0)
      })
      rs.push('asd')
      expect(pt.listenerCount('drain')).toBe(0)
      process.nextTick(() => {
        rs.push('asd')
        expect(pt.listenerCount('drain')).toBe(0)
        rs.push(null)
        expect(pt.listenerCount('drain')).toBe(0)
        // Give enough time for the finish event to fire, then resolve
        setTimeout(() => {
          resolve()
        }, 50)
      })
    }))
})
