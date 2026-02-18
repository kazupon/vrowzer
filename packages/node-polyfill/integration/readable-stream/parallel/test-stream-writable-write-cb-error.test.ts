import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

// Ensure callback is always invoked before
// error is emitted. Regardless if error was
// sync or async.

describe('test-stream-writable-write-cb-error', () => {
  it('sync error: callback invoked before error event', () =>
    new Promise<void>(resolve => {
      let callbackCalled = false
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: (err: Error) => void) => {
          cb(new Error())
        }) as (chunk: unknown, encoding: string, cb: (err: Error) => void) => void
      })
      writable.on(
        'error',
        mustCall(() => {
          expect(callbackCalled).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.write(
        'hi',
        mustCall(() => {
          callbackCalled = true
        }) as (...args: unknown[]) => void
      )
    }))

  it('async error: callback invoked before error event', () =>
    new Promise<void>(resolve => {
      let callbackCalled = false
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: (err: Error) => void) => {
          process.nextTick(cb, new Error())
        }) as (chunk: unknown, encoding: string, cb: (err: Error) => void) => void
      })
      writable.on(
        'error',
        mustCall(() => {
          expect(callbackCalled).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.write(
        'hi',
        mustCall(() => {
          callbackCalled = true
        }) as (...args: unknown[]) => void
      )
    }))

  it('sync error: no live lock', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: (err: Error) => void) => {
          cb(new Error())
        }) as (chunk: unknown, encoding: string, cb: (err: Error) => void) => void
      })
      writable.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      let cnt = 0
      // Ensure we don't live lock on sync error
      while (writable.write('a')) {
        cnt++
      }
      expect(cnt).toBe(0)
    }))
})
