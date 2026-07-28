import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Transform } from 'readable-stream'

describe('test-stream-transform-destroy', () => {
  it('destroy without error', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {}
      })
      transform.resume()
      transform.on('end', mustNotCall() as (...args: unknown[]) => void)
      transform.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.on('finish', mustNotCall() as (...args: unknown[]) => void)
      transform.destroy()
    }))

  it('destroy with error', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {}
      })
      transform.resume()
      const expected = new Error('kaboom')
      transform.on('end', mustNotCall() as (...args: unknown[]) => void)
      transform.on('finish', mustNotCall() as (...args: unknown[]) => void)
      transform.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      transform.destroy(expected)
    }))

  it('custom _destroy with error passthrough', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {}
      })
      const expected = new Error('kaboom')
      transform._destroy = mustCall(function (
        this: Transform,
        err: Error | null,
        cb: (err: Error | null) => void
      ) {
        expect(err).toBe(expected)
        cb(err)
      }, 1) as (err: Error | null, cb: (err: Error | null) => void) => void
      transform.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      transform.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
        }) as (...args: unknown[]) => void
      )
      transform.destroy(expected)
    }))

  it('custom destroy option swallows error', () =>
    new Promise<void>(resolve => {
      const expected = new Error('kaboom')
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {},
        destroy: mustCall(function (this: Transform, err: Error | null, cb: () => void) {
          expect(err).toBe(expected)
          cb()
        }, 1) as any
      })
      transform.resume()
      transform.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      transform.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      transform.on('error', mustNotCall('no error event') as (...args: unknown[]) => void)
      transform.destroy(expected)
    }))

  it('custom _destroy with null error', () => {
    const transform = new Transform({
      transform(_chunk, _enc, _cb) {}
    })
    transform._destroy = mustCall(function (this: Transform, err: Error | null, cb: () => void) {
      expect(err).toBe(null)
      cb()
    }, 1) as any
    transform.destroy()
  })

  it('custom _destroy pushing null and ending after destroy', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {}
      })
      transform.resume()
      transform._destroy = mustCall(function (this: Transform, err: Error | null, cb: () => void) {
        expect(err).toBe(null)
        process.nextTick(() => {
          this.push(null)
          this.end()
          cb()
        })
      }, 1) as any
      const fail = mustNotCall('no event') as (...args: unknown[]) => void
      transform.on('finish', fail)
      transform.on('end', fail)
      transform.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.destroy()
      transform.removeListener('end', fail)
      transform.removeListener('finish', fail)
      transform.on('end', mustCall() as (...args: unknown[]) => void)
      transform.on('finish', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('custom _destroy returning error from null', () =>
    new Promise<void>(resolve => {
      const transform = new Transform({
        transform(_chunk, _enc, _cb) {}
      })
      const expected = new Error('kaboom')
      transform._destroy = mustCall(function (
        this: Transform,
        err: Error | null,
        cb: (err: Error) => void
      ) {
        expect(err).toBe(null)
        cb(expected)
      }, 1) as (err: Error | null, cb: (err: Error) => void) => void
      transform.on('close', mustCall() as (...args: unknown[]) => void)
      transform.on('finish', mustNotCall('no finish event') as (...args: unknown[]) => void)
      transform.on('end', mustNotCall('no end event') as (...args: unknown[]) => void)
      transform.on(
        'error',
        mustCall((err: Error) => {
          expect(err).toBe(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      transform.destroy()
    }))
})
