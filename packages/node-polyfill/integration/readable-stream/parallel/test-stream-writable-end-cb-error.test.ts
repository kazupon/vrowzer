import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writable-end-cb-error', () => {
  it('invoke end callback on failure', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      const _err = new Error('kaboom')
      writable._write = (_chunk, _encoding, cb) => {
        process.nextTick(cb, _err)
      }
      writable.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.write('asd')
      writable.end(
        mustCall((err: Error) => {
          expect(err).toBe(_err)
        }) as (...args: unknown[]) => void
      )
      writable.end(
        mustCall((err: Error) => {
          expect(err).toBe(_err)
        }) as (...args: unknown[]) => void
      )
    }))

  it('do not invoke end callback twice', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunk, _encoding, cb) => {
        process.nextTick(cb)
      }
      let called = false
      writable.end(
        'asd',
        mustCall((err: unknown) => {
          called = true
          expect(err).toBe(undefined)
        }) as (...args: unknown[]) => void
      )
      writable.on(
        'error',
        mustCall((err: Error) => {
          expect(err.message).toBe('kaboom')
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.on(
        'finish',
        mustCall(() => {
          expect(called).toBe(true)
          writable.emit('error', new Error('kaboom'))
        }) as (...args: unknown[]) => void
      )
    }))

  it('end callback receives ERR_STREAM_WRITE_AFTER_END', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, callback) {
          setImmediate(callback)
        }
        // The original test uses 'finish' as a constructor option, which
        // is NOT recognized by Writable (it's not _final). So effectively
        // there is no _final method on this stream.
      })
      let cbCount = 0
      const totalExpectedCbs = 4 // 3 end callbacks + 1 error handler
      function maybeResolve() {
        cbCount++
        if (cbCount >= totalExpectedCbs) {
          resolve()
        }
      }
      w.end(
        'testing ended state',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_WRITE_AFTER_END')
          maybeResolve()
        }) as (...args: unknown[]) => void
      )
      expect(w.destroyed).toBe(false)
      expect(w.writableEnded).toBe(true)
      w.end(
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_WRITE_AFTER_END')
          maybeResolve()
        }) as (...args: unknown[]) => void
      )
      expect(w.destroyed).toBe(false)
      expect(w.writableEnded).toBe(true)
      w.end(
        'end',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_WRITE_AFTER_END')
          maybeResolve()
        }) as (...args: unknown[]) => void
      )
      expect(w.destroyed).toBe(true)
      w.on(
        'error',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_WRITE_AFTER_END')
          maybeResolve()
        }) as (...args: unknown[]) => void
      )
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
    }))
})
