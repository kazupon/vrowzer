import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-catch-rejections', () => {
  it('readable captureRejections', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        // @ts-ignore - captureRejections exists at runtime
        captureRejections: true,
        read() {}
      })
      r.push('hello')
      r.push('world')

      const err = new Error('kaboom')
      r.on(
        'error',
        mustCall((_err: Error) => {
          expect(err).toBe(_err)
          expect(r.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.on('data', async () => {
        throw err
      })
    }))

  it('writable captureRejections', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        // @ts-ignore - captureRejections exists at runtime
        captureRejections: true,
        highWaterMark: 1,
        write(_chunk, _enc, cb) {
          process.nextTick(cb)
        }
      })

      const err = new Error('kaboom')
      w.write('hello', () => {
        w.write('world')
      })
      w.on(
        'error',
        mustCall((_err: Error) => {
          expect(err).toBe(_err)
          expect(w.destroyed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.on(
        'drain',
        mustCall(async () => {
          throw err
        }, 2) as (...args: unknown[]) => void
      )
    }))
})
