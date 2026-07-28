import * as stream from 'readable-stream'
import { describe, expect, it } from 'vite-plus/test'
import { mustNotCall } from '../common/index.ts'

class MyWritable extends stream.Writable {
  constructor(options?: stream.WritableOptions) {
    super({
      // @ts-ignore - autoDestroy exists at runtime
      autoDestroy: false,
      ...options
    })
  }
  _write(chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) {
    expect(chunk).not.toBe(null)
    callback()
  }
}

describe('test-stream-writable-null', () => {
  it('should throw ERR_STREAM_NULL_VALUES when writing null in objectMode', () => {
    const m = new MyWritable({
      objectMode: true
    })
    m.on('error', mustNotCall() as (...args: unknown[]) => void)
    expect(() => {
      m.write(null)
    }).toThrow(
      expect.objectContaining({
        code: 'ERR_STREAM_NULL_VALUES'
      })
    )
  })

  it('should throw ERR_INVALID_ARG_TYPE when writing non-string/buffer in non-objectMode', () => {
    const m = new MyWritable()
    m.on('error', mustNotCall() as (...args: unknown[]) => void)
    expect(() => {
      m.write(false as unknown as string)
    }).toThrow(
      expect.objectContaining({
        code: 'ERR_INVALID_ARG_TYPE'
      })
    )
  })

  it('should not throw when writing false in objectMode', () =>
    new Promise<void>(resolve => {
      const m = new MyWritable({
        objectMode: true
      })
      m.write(false as unknown as string, err => {
        expect(err).toBeFalsy()
        resolve()
      })
    }))

  it('should not throw when writing false in objectMode with error handler', () =>
    new Promise<void>(resolve => {
      const m = new MyWritable({
        objectMode: true
      }).on('error', e => {
        expect(e || new Error('should not get here')).toBeFalsy()
      })
      m.write(false as unknown as string, err => {
        expect(err).toBeFalsy()
        resolve()
      })
    }))
})
