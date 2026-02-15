import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-once-readable-pipe', () => {
  it('should not disrupt pipe when readable listener is added before pipe', () =>
    new Promise<void>(resolve => {
      let receivedData = ''
      const w = new Writable({
        write: (chunk, _env, callback) => {
          receivedData += chunk
          callback()
        }
      })
      const data = ['foo', 'bar', 'baz']
      const r = new Readable({
        read: () => {}
      })
      r.once('readable', mustCall() as (...args: unknown[]) => void)
      r.pipe(w)
      r.push(data[0])
      r.push(data[1])
      r.push(data[2])
      r.push(null)
      w.on(
        'finish',
        mustCall(() => {
          expect(receivedData).toBe(data.join(''))
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should not disrupt pipe when readable listener is added after pipe', () =>
    new Promise<void>(resolve => {
      let receivedData = ''
      const w = new Writable({
        write: (chunk, _env, callback) => {
          receivedData += chunk
          callback()
        }
      })
      const data = ['foo', 'bar', 'baz']
      const r = new Readable({
        read: () => {}
      })
      r.pipe(w)
      r.push(data[0])
      r.push(data[1])
      r.push(data[2])
      r.push(null)
      r.once('readable', mustCall() as (...args: unknown[]) => void)
      w.on(
        'finish',
        mustCall(() => {
          expect(receivedData).toBe(data.join(''))
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
