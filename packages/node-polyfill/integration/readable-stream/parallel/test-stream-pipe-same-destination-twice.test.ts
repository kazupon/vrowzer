import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { PassThrough, Writable } from 'readable-stream'

describe('test-stream-pipe-same-destination-twice', () => {
  // Regression test for https://github.com/nodejs/node/issues/12718.
  // Tests that piping a source stream twice to the same destination stream
  // works, and that a subsequent unpipe() call only removes the pipe *once*.

  it('should unpipe only once when piped twice', () =>
    new Promise<void>(resolve => {
      const passThrough = new PassThrough()
      const dest = new Writable({
        write: mustCall((chunk: Buffer, _encoding: string, cb: () => void) => {
          expect(`${chunk}`).toBe('foobar')
          cb()
          resolve()
        }) as (...args: unknown[]) => void
      })
      passThrough.pipe(dest)
      passThrough.pipe(dest)
      expect((passThrough as any)._events.data.length).toBe(2)
      expect((passThrough as any)._readableState.pipes.length).toBe(2)
      expect((passThrough as any)._readableState.pipes[0]).toBe(dest)
      expect((passThrough as any)._readableState.pipes[1]).toBe(dest)
      passThrough.unpipe(dest)
      expect((passThrough as any)._events.data.length).toBe(1)
      expect((passThrough as any)._readableState.pipes.length).toBe(1)
      expect((passThrough as any)._readableState.pipes).toEqual([dest])
      passThrough.write('foobar')
      passThrough.pipe(dest)
    }))

  it('should write twice when piped twice without unpipe', () =>
    new Promise<void>(resolve => {
      const passThrough = new PassThrough()
      const dest = new Writable({
        write: mustCall((chunk: Buffer, _encoding: string, cb: () => void) => {
          expect(`${chunk}`).toBe('foobar')
          cb()
        }, 2) as (...args: unknown[]) => void
      })
      passThrough.pipe(dest)
      passThrough.pipe(dest)
      expect((passThrough as any)._events.data.length).toBe(2)
      expect((passThrough as any)._readableState.pipes.length).toBe(2)
      expect((passThrough as any)._readableState.pipes[0]).toBe(dest)
      expect((passThrough as any)._readableState.pipes[1]).toBe(dest)
      passThrough.write('foobar')
      dest.on('finish', () => resolve())
      passThrough.end()
    }))

  it('should fully unpipe when unpipe is called twice', () => {
    const passThrough = new PassThrough()
    const dest = new Writable({
      write: mustNotCall() as (...args: unknown[]) => void
    })
    passThrough.pipe(dest)
    passThrough.pipe(dest)
    expect((passThrough as any)._events.data.length).toBe(2)
    expect((passThrough as any)._readableState.pipes.length).toBe(2)
    expect((passThrough as any)._readableState.pipes[0]).toBe(dest)
    expect((passThrough as any)._readableState.pipes[1]).toBe(dest)
    passThrough.unpipe(dest)
    passThrough.unpipe(dest)
    expect((passThrough as any)._events.data).toBe(undefined)
    expect((passThrough as any)._readableState.pipes.length).toBe(0)
    passThrough.write('foobar')
  })
})
