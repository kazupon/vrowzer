import { Writable } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'

describe('test-stream-writable-writable', () => {
  it('should set writable to false after destroy', () => {
    const w = new Writable({
      write() {}
    })
    expect(w.writable).toBe(true)
    w.destroy()
    expect(w.writable).toBe(false)
  })

  it('should set writable to false after write error with callback', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write: mustCall(
          (_chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) => {
            callback(new Error())
          }
        ) as (...args: unknown[]) => void as unknown as (
          chunk: unknown,
          encoding: string,
          callback: (error?: Error | null) => void
        ) => void
      })
      expect(w.writable).toBe(true)
      w.write('asd')
      expect(w.writable).toBe(false)
      w.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should set writable to false after async write error', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write: mustCall(
          (_chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) => {
            process.nextTick(() => {
              callback(new Error())
              expect(w.writable).toBe(false)
            })
          }
        ) as (...args: unknown[]) => void as unknown as (
          chunk: unknown,
          encoding: string,
          callback: (error?: Error | null) => void
        ) => void
      })
      w.write('asd')
      w.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should set writable to false after end', () => {
    const w = new Writable({
      write: mustNotCall() as (...args: unknown[]) => void as unknown as (
        chunk: unknown,
        encoding: string,
        callback: (error?: Error | null) => void
      ) => void
    })
    expect(w.writable).toBe(true)
    w.end()
    expect(w.writable).toBe(false)
  })
})
