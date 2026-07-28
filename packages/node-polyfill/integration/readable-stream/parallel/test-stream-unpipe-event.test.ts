import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable, Readable } from 'readable-stream'

class NullWriteable extends Writable {
  _write(_chunk: unknown, _encoding: string, callback: () => void) {
    return callback()
  }
}

class QuickEndReadable extends Readable {
  _read() {
    this.push(null)
  }
}

class NeverEndReadable extends Readable {
  _read() {}
}

describe('test-stream-unpipe-event', () => {
  it('QuickEndReadable emits unpipe after end', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new QuickEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on('unpipe', mustCall() as (...args: unknown[]) => void)
      src.pipe(dest)
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(0)
        resolve()
      })
    }))

  it('NeverEndReadable does not emit unpipe', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new NeverEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on(
        'unpipe',
        mustNotCall('unpipe should not have been emitted') as (...args: unknown[]) => void
      )
      src.pipe(dest)
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(1)
        resolve()
      })
    }))

  it('NeverEndReadable emits unpipe after manual unpipe', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new NeverEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on('unpipe', mustCall() as (...args: unknown[]) => void)
      src.pipe(dest)
      src.unpipe(dest)
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(0)
        resolve()
      })
    }))

  it('QuickEndReadable with end:false emits unpipe', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new QuickEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on('unpipe', mustCall() as (...args: unknown[]) => void)
      src.pipe(dest, {
        end: false
      })
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(0)
        resolve()
      })
    }))

  it('NeverEndReadable with end:false does not emit unpipe', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new NeverEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on(
        'unpipe',
        mustNotCall('unpipe should not have been emitted') as (...args: unknown[]) => void
      )
      src.pipe(dest, {
        end: false
      })
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(1)
        resolve()
      })
    }))

  it('NeverEndReadable with end:false emits unpipe after manual unpipe', () =>
    new Promise<void>(resolve => {
      const dest = new NullWriteable()
      const src = new NeverEndReadable()
      dest.on('pipe', mustCall() as (...args: unknown[]) => void)
      dest.on('unpipe', mustCall() as (...args: unknown[]) => void)
      src.pipe(dest, {
        end: false
      })
      src.unpipe(dest)
      setImmediate(() => {
        expect((src as any)._readableState.pipes.length).toBe(0)
        resolve()
      })
    }))
})
