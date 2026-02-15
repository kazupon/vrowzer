import { describe, it, expect } from 'vitest'
import { Transform } from 'readable-stream'

describe('test-stream-transform-split-objectmode', () => {
  it('readableObjectMode parser', () => {
    const parser = new Transform({ readableObjectMode: true })
    expect((parser as any)._readableState.objectMode).toBeTruthy()
    expect((parser as any)._writableState.objectMode).toBeFalsy()
    expect(parser.readableHighWaterMark).toBe(16)
    expect(parser.writableHighWaterMark).toBe(16 * 1024)
    expect(parser.readableHighWaterMark).toBe((parser as any)._readableState.highWaterMark)
    expect(parser.writableHighWaterMark).toBe((parser as any)._writableState.highWaterMark)

    parser._transform = function (chunk, _enc, callback) {
      callback(null, { val: chunk[0] })
    }

    let parsed: { val: number } | undefined
    parser.on('data', function (obj: { val: number }) {
      parsed = obj
    })
    parser.end(Buffer.from([42]))

    // The data event fires synchronously on end, so parsed is set
    expect(parsed!.val).toBe(42)
  })

  it('writableObjectMode serializer', () => {
    const serializer = new Transform({ writableObjectMode: true })
    expect((serializer as any)._readableState.objectMode).toBeFalsy()
    expect((serializer as any)._writableState.objectMode).toBeTruthy()
    expect(serializer.readableHighWaterMark).toBe(16 * 1024)
    expect(serializer.writableHighWaterMark).toBe(16)

    serializer._transform = function (obj, _, callback) {
      callback(null, Buffer.from([obj.val]))
    }

    let serialized: Buffer | undefined
    serializer.on('data', function (chunk: Buffer) {
      serialized = chunk
    })
    serializer.write({ val: 42 })

    expect(serialized![0]).toBe(42)
  })
})
