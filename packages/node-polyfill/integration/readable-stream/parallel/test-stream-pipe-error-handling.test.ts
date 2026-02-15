import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Stream, PassThrough } from 'readable-stream'

describe('test-stream-pipe-error-handling', () => {
  it('source error with error listener', () => {
    const source = new Stream()
    const dest = new Stream()
    // @ts-ignore - Stream missing WritableStream props but works at runtime
    source.pipe(dest)
    let gotErr: Error | null = null
    source.on('error', function (err: Error) {
      gotErr = err
    })
    const err = new Error('This stream turned into bacon.')
    source.emit('error', err)
    expect(gotErr).toBe(err)
  })

  it('source error without error listener throws', () => {
    const source = new Stream()
    const dest = new Stream()
    // @ts-ignore - Stream missing WritableStream props but works at runtime
    source.pipe(dest)
    const err = new Error('This stream turned into bacon.')
    let gotErr: Error | null = null
    try {
      source.emit('error', err)
    } catch (e) {
      gotErr = e as Error
    }
    expect(gotErr).toBe(err)
  })

  it('removed error listener allows error to throw', () =>
    new Promise<void>(resolve => {
      const R = (Stream as any).Readable
      const W = (Stream as any).Writable
      const r = new R({
        autoDestroy: false
      })
      const w = new W({
        autoDestroy: false
      })
      let removed = false
      r._read = mustCall(function () {
        setTimeout(
          mustCall(function () {
            expect(removed).toBeTruthy()
            expect(() => {
              w.emit('error', new Error('fail'))
            }).toThrow(/fail/)
            resolve()
          }) as (...args: unknown[]) => void,
          1
        )
      }) as (...args: unknown[]) => void
      w.on('error', myOnError)
      r.pipe(w)
      w.removeListener('error', myOnError)
      removed = true
      function myOnError() {
        throw new Error('this should not happen')
      }
    }))

  it('removing other random listener keeps error handler', () =>
    new Promise<void>(resolve => {
      const R = (Stream as any).Readable
      const W = (Stream as any).Writable
      const r = new R()
      const w = new W()
      let removed = false
      r._read = mustCall(function () {
        setTimeout(
          mustCall(function () {
            expect(removed).toBeTruthy()
            w.emit('error', new Error('fail'))
            resolve()
          }) as (...args: unknown[]) => void,
          1
        )
      }) as (...args: unknown[]) => void
      w.on('error', mustCall() as (...args: unknown[]) => void)
      w._write = () => {}
      r.pipe(w)
      w.removeListener('error', () => {})
      removed = true
    }))

  it('destination error with error listener', () =>
    new Promise<void>(resolve => {
      const _err = new Error('this should be handled')
      const destination = new PassThrough()
      destination.once(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (...args: unknown[]) => void
      )
      const stream = new Stream()
      stream.pipe(destination)
      destination.destroy(_err)
    }))
})
