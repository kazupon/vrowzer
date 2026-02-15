import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { PassThrough } from 'readable-stream'

describe('test-stream-transform-objectmode-falsey-value', () => {
  it('should pass through falsey values in objectMode', () =>
    new Promise<void>(resolve => {
      const src = new PassThrough({ objectMode: true })
      const tx = new PassThrough({ objectMode: true })
      const dest = new PassThrough({ objectMode: true })
      const expected = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const results: number[] = []
      dest.on(
        'data',
        mustCall(function (x: number) {
          results.push(x)
        }, expected.length) as (...args: unknown[]) => void
      )
      src.pipe(tx).pipe(dest)
      let i = -1
      const int = setInterval(
        mustCall(function () {
          if (results.length === expected.length) {
            src.end()
            clearInterval(int)
            expect(results).toStrictEqual(expected)
            resolve()
          } else {
            src.write(i++)
          }
        }, expected.length + 1) as () => void,
        1
      )
    }))
})
