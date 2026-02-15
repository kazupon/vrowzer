import { describe, it } from 'vitest'
import { mustCall, expectsError } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writable-write-cb-twice', () => {
  it('sync + sync double callback emits error', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: () => void) => {
          cb()
          cb()
        }) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      writable.write('hi')
      writable.on('error', (...args: unknown[]) => {
        ;(expectsError({ code: 'ERR_MULTIPLE_CALLBACK', name: 'Error' }) as Function)(...args)
        resolve()
      })
    }))

  it('sync + async double callback emits error', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: () => void) => {
          cb()
          process.nextTick(() => {
            cb()
          })
        }) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      writable.write('hi')
      writable.on('error', (...args: unknown[]) => {
        ;(expectsError({ code: 'ERR_MULTIPLE_CALLBACK', name: 'Error' }) as Function)(...args)
        resolve()
      })
    }))

  it('async + async double callback emits error', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        write: mustCall((_buf: unknown, _enc: string, cb: () => void) => {
          process.nextTick(cb)
          process.nextTick(() => {
            cb()
          })
        }) as (chunk: unknown, encoding: string, cb: () => void) => void
      })
      writable.write('hi')
      writable.on('error', (...args: unknown[]) => {
        ;(expectsError({ code: 'ERR_MULTIPLE_CALLBACK', name: 'Error' }) as Function)(...args)
        resolve()
      })
    }))
})
