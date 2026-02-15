import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable, Readable } from 'readable-stream'

// Ensure consistency between the finish event when using cork()
// and writev and when not using them

describe('test-stream-writable-write-writev-finish', () => {
  it('sync write error prevents finish', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunks, _encoding, cb) => {
        cb(new Error('write test error'))
      }
      writable.on('finish', mustNotCall() as (...args: unknown[]) => void)
      writable.on('prefinish', mustNotCall() as (...args: unknown[]) => void)
      writable.on(
        'error',
        mustCall((er: Error) => {
          expect(er.message).toBe('write test error')
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.end('test')
    }))

  it('async write error prevents finish', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunks, _encoding, cb) => {
        setImmediate(cb, new Error('write test error'))
      }
      writable.on('finish', mustNotCall() as (...args: unknown[]) => void)
      writable.on('prefinish', mustNotCall() as (...args: unknown[]) => void)
      writable.on(
        'error',
        mustCall((er: Error) => {
          expect(er.message).toBe('write test error')
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.end('test')
    }))

  it('sync writev error prevents finish', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunks, _encoding, cb) => {
        cb(new Error('write test error'))
      }
      writable._writev = (_chunks, cb) => {
        cb(new Error('writev test error'))
      }
      writable.on('finish', mustNotCall() as (...args: unknown[]) => void)
      writable.on('prefinish', mustNotCall() as (...args: unknown[]) => void)
      writable.on(
        'error',
        mustCall((er: Error) => {
          expect(er.message).toBe('writev test error')
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.cork()
      writable.write('test')
      setImmediate(function () {
        writable.end('test')
      })
    }))

  it('async writev error prevents finish', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunks, _encoding, cb) => {
        setImmediate(cb, new Error('write test error'))
      }
      writable._writev = (_chunks, cb) => {
        setImmediate(cb, new Error('writev test error'))
      }
      writable.on('finish', mustNotCall() as (...args: unknown[]) => void)
      writable.on('prefinish', mustNotCall() as (...args: unknown[]) => void)
      writable.on(
        'error',
        mustCall((er: Error) => {
          expect(er.message).toBe('writev test error')
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.cork()
      writable.write('test')
      setImmediate(function () {
        writable.end('test')
      })
    }))

  // Regression test for https://github.com/nodejs/node/issues/13812
  it('pipe with async write error prevents finish', () =>
    new Promise<void>(resolve => {
      const rs = new Readable()
      rs.push('ok')
      rs.push(null)
      rs._read = () => {}
      const ws = new Writable()
      ws.on('finish', mustNotCall() as (...args: unknown[]) => void)
      ws.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      ws._write = (_chunk, _encoding, done) => {
        setImmediate(done, new Error())
      }
      rs.pipe(ws)
    }))

  it('pipe with sync write error prevents finish', () =>
    new Promise<void>(resolve => {
      const rs = new Readable()
      rs.push('ok')
      rs.push(null)
      rs._read = () => {}
      const ws = new Writable()
      ws.on('finish', mustNotCall() as (...args: unknown[]) => void)
      ws.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      ws._write = (_chunk, _encoding, done) => {
        done(new Error())
      }
      rs.pipe(ws)
    }))

  it('write in prefinish listener emits error', () =>
    new Promise<void>(resolve => {
      const w = new Writable()
      w._write = (_chunk, _encoding, cb) => {
        process.nextTick(cb)
      }
      w.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.on('finish', mustNotCall() as (...args: unknown[]) => void)
      w.on('prefinish', () => {
        w.write("shouldn't write in prefinish listener")
      })
      w.end()
    }))

  it('write in finish listener emits error', () =>
    new Promise<void>(resolve => {
      const w = new Writable()
      w._write = (_chunk, _encoding, cb) => {
        process.nextTick(cb)
      }
      w.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.on('finish', () => {
        w.write("shouldn't write in finish listener")
      })
      w.end()
    }))
})
