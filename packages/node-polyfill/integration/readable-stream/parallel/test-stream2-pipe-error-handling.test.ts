import { describe, it, expect } from 'vitest'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-pipe-error-handling', () => {
  it('should unpipe on error with error listener', () => {
    let count = 1000
    const source = new Readable()
    source._read = function (n) {
      n = Math.min(count, n)
      count -= n
      source.push(Buffer.allocUnsafe(n))
    }

    let unpipedDest: any
    source.unpipe = function (dest) {
      unpipedDest = dest
      Readable.prototype.unpipe.call(this, dest)
      return this
    }

    const dest = new Writable()
    dest._write = function (_chunk, _encoding, cb) {
      cb()
    }

    source.pipe(dest)

    let gotErr: Error | null = null
    dest.on('error', function (err) {
      gotErr = err
    })

    let unpipedSource: any
    dest.on('unpipe', function (src) {
      unpipedSource = src
    })

    const err = new Error('This stream turned into bacon.')
    dest.emit('error', err)
    expect(gotErr).toBe(err)
    expect(unpipedSource).toBe(source)
    expect(unpipedDest).toBe(dest)
  })

  it('should unpipe on error without error listener (autoDestroy false)', () => {
    let count = 1000
    const source = new Readable()
    source._read = function (n) {
      n = Math.min(count, n)
      count -= n
      source.push(Buffer.allocUnsafe(n))
    }

    let unpipedDest: any
    source.unpipe = function (dest) {
      unpipedDest = dest
      Readable.prototype.unpipe.call(this, dest)
      return this
    }

    const dest = new Writable({
      // @ts-ignore - autoDestroy exists at runtime
      autoDestroy: false
    })
    dest._write = function (_chunk, _encoding, cb) {
      cb()
    }

    source.pipe(dest)

    let unpipedSource: any
    dest.on('unpipe', function (src) {
      unpipedSource = src
    })

    const err = new Error('This stream turned into bacon.')
    let gotErr: Error | null = null
    try {
      dest.emit('error', err)
    } catch (e) {
      gotErr = e as Error
    }
    expect(gotErr).toBe(err)
    expect(unpipedSource).toBe(source)
    expect(unpipedDest).toBe(dest)
  })
})
