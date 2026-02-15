import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream2-readable-non-empty-end', () => {
  it('should not end prematurely when readable data remains', () =>
    new Promise<void>(resolve => {
      let len = 0
      const chunks = new Array(10)
      for (let i = 1; i <= 10; i++) {
        chunks[i - 1] = Buffer.allocUnsafe(i)
        len += i
      }

      const test = new Readable()
      let n = 0
      test._read = function () {
        const chunk = chunks[n++]
        setTimeout(function () {
          test.push(chunk === undefined ? null : chunk)
        }, 1)
      }

      test.on('end', thrower)

      function thrower() {
        throw new Error('this should not happen!')
      }

      let bytesread = 0
      test.on('readable', function () {
        const b = len - bytesread - 1
        const res = test.read(b)
        if (res) {
          bytesread += res.length
          setTimeout(next, 1)
        }
        test.read(0)
      })

      test.read(0)

      function next() {
        // Now let's make 'end' happen
        test.removeListener('end', thrower)
        test.on(
          'end',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )

        // One to get the last byte
        let r = test.read()
        expect(r).toBeTruthy()
        expect(r!.length).toBe(1)
        r = test.read()
        expect(r).toBe(null)
      }
    }))
})
