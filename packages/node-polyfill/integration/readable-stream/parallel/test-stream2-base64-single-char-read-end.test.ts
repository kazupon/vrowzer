import { describe, it, expect } from 'vitest'
import { Readable, Writable } from 'readable-stream'

describe('test-stream2-base64-single-char-read-end', () => {
  it('should correctly encode a single char to base64 and end', () =>
    new Promise<void>(resolve => {
      const src = new Readable({
        encoding: 'base64'
      })
      const dst = new Writable()
      let hasRead = false
      const accum: Buffer[] = []
      src._read = function () {
        if (!hasRead) {
          hasRead = true
          process.nextTick(function () {
            src.push(Buffer.from('1'))
            src.push(null)
          })
        }
      }
      dst._write = function (chunk, _enc, cb) {
        accum.push(chunk as Buffer)
        cb()
      }
      src.on('end', function () {
        expect(String(Buffer.concat(accum))).toBe('MQ==')
        resolve()
      })
      src.pipe(dst)
    }))
})
