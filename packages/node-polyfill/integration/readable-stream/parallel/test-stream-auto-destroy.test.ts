import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable, Transform } from 'readable-stream'

describe('test-stream-auto-destroy', () => {
  it('readable autoDestroy', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        read() {
          this.push('hello')
          this.push('world')
          this.push(null)
        },
        destroy: mustCall((_err: Error | null, cb: () => void) => cb()) as any
      })
      let ended = false
      r.resume()
      r.on(
        'end',
        mustCall(() => {
          ended = true
        }) as (...args: unknown[]) => void
      )
      r.on(
        'close',
        mustCall(() => {
          expect(ended).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('writable autoDestroy', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        write(_data, _enc, cb) {
          cb(null)
        },
        destroy: mustCall((_err: Error | null, cb: () => void) => cb()) as any
      })
      let finished = false
      w.write('hello')
      w.write('world')
      w.end()
      w.on(
        'finish',
        mustCall(() => {
          finished = true
        }) as (...args: unknown[]) => void
      )
      w.on(
        'close',
        mustCall(() => {
          expect(finished).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('transform autoDestroy', () =>
    new Promise<void>(resolve => {
      const t = new Transform({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        transform(data, _enc, cb) {
          cb(null, data)
        },
        destroy: mustCall((_err: Error | null, cb: () => void) => cb()) as any
      })
      let ended = false
      let finished = false
      t.write('hello')
      t.write('world')
      t.end()
      t.resume()
      t.on(
        'end',
        mustCall(() => {
          ended = true
        }) as (...args: unknown[]) => void
      )
      t.on(
        'finish',
        mustCall(() => {
          finished = true
        }) as (...args: unknown[]) => void
      )
      t.on(
        'close',
        mustCall(() => {
          expect(ended).toBeTruthy()
          expect(finished).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('readable pipe to autoDestroy readable on error', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {
          r2.emit('error', new Error('fail'))
        }
      })
      const r2 = new Readable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        destroy: mustCall((_err: Error | null, cb: () => void) => {
          cb()
          resolve()
        }) as any
      })
      // @ts-ignore - pipe to Readable (missing WritableStream props)
      r.pipe(r2)
    }))

  it('readable pipe to autoDestroy writable on error', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {
          w.emit('error', new Error('fail'))
        }
      })
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        destroy: mustCall((_err: Error | null, cb: () => void) => {
          cb()
          resolve()
        }) as any
      })
      r.pipe(w)
    }))
})
