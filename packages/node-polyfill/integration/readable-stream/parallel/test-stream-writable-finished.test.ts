import { Writable } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-writable-finished', () => {
  it('should have writableFinished on prototype', () => {
    expect(Reflect.has(Writable.prototype, 'writableFinished')).toBeTruthy()
  })

  it('should set writableFinished after finish event', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable._write = (_chunk, _encoding, cb) => {
        expect(writable.writableFinished).toBe(false)
        cb()
      }
      writable.on(
        'finish',
        mustCall(() => {
          expect(writable.writableFinished).toBe(true)
        }) as (...args: unknown[]) => void
      )
      writable.end(
        'testing finished state',
        mustCall(() => {
          expect(writable.writableFinished).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should emit finish asynchronously', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb()
        }
      })
      w.end()
      w.on(
        'finish',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should emit prefinish synchronously', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb()
        }
      })
      let sync = true
      w.on(
        'prefinish',
        mustCall(() => {
          expect(sync).toBe(true)
        }) as (...args: unknown[]) => void
      )
      w.on('finish', () => resolve())
      w.end()
      sync = false
    }))

  it('should emit prefinish synchronously with final', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb()
        },
        final(cb) {
          cb()
        }
      })
      let sync = true
      w.on(
        'prefinish',
        mustCall(() => {
          expect(sync).toBe(true)
        }) as (...args: unknown[]) => void
      )
      w.on('finish', () => resolve())
      w.end()
      sync = false
    }))

  it('should call _final synchronously', () =>
    new Promise<void>(resolve => {
      let sync = true
      const w = new Writable({
        write(_chunk, _encoding, cb) {
          cb()
        },
        final: mustCall((cb: () => void) => {
          expect(sync).toBe(true)
          cb()
        }) as (...args: unknown[]) => void as unknown as (
          callback: (error?: Error | null) => void
        ) => void
      })
      w.on('finish', () => resolve())
      w.end()
      sync = false
    }))
})
