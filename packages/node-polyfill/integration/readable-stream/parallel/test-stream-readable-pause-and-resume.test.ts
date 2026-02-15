import { PassThrough, Readable } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-readable-pause-and-resume', () => {
  it('should handle pause and resume with data events', () =>
    new Promise<void>(resolve => {
      let ticks = 18
      let expectedData = 19
      const rs = new Readable({
        objectMode: true,
        read: () => {
          if (ticks-- > 0) return process.nextTick(() => rs.push({}))
          rs.push({})
          rs.push(null)
        }
      })
      rs.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      readAndPause()
      function readAndPause() {
        const ondata = mustCall((_data: unknown) => {
          rs.pause()
          expectedData--
          if (expectedData <= 0) return
          setImmediate(function () {
            rs.removeListener('data', ondata as (...args: unknown[]) => void)
            readAndPause()
            rs.resume()
          })
        }, 1) as (...args: unknown[]) => void
        rs.on('data', ondata)
      }
    }))

  it('should remain paused after removing readable listener and pausing', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read() {}
      })
      function read() {}
      readable.setEncoding('utf8')
      readable.on('readable', read)
      readable.removeListener('readable', read)
      readable.pause()
      process.nextTick(function () {
        expect(readable.isPaused()).toBeTruthy()
        resolve()
      })
    }))

  it('should not pause source when piped and target drains', () =>
    new Promise<void>(resolve => {
      const source3 = new PassThrough()
      const target3 = new PassThrough()
      const chunk = Buffer.allocUnsafe(1000)
      while (target3.write(chunk));
      source3.pipe(target3)
      target3.on(
        'drain',
        mustCall(() => {
          expect(!source3.isPaused()).toBeTruthy()
          resolve()
        }) as (...args: unknown[]) => void
      )
      target3.on('data', () => {})
    }))
})
