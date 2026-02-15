import { describe, it, expect } from 'vitest'
import { Readable } from 'readable-stream'

describe('test-stream-unshift-empty-chunk', () => {
  // This test verifies that stream.unshift(Buffer.alloc(0)) or
  // stream.unshift('') does not set state.reading=false.
  it('should not break readable state when unshifting empty chunk', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      let nChunks = 10
      const chunk = Buffer.alloc(10, 'x')
      r._read = function (_n) {
        setImmediate(() => {
          r.push(--nChunks === 0 ? null : chunk)
        })
      }

      let readAll = false
      const seen: string[] = []
      r.on('readable', () => {
        let chunk
        while ((chunk = r.read()) !== null) {
          seen.push(chunk.toString())
          // Simulate only reading a certain amount of the data,
          // and then putting the rest of the chunk back into the
          // stream, like a parser might do.  We just fill it with
          // 'y' so that it's easy to see which bits were touched,
          // and which were not.
          const putBack = Buffer.alloc(readAll ? 0 : 5, 'y')
          readAll = !readAll
          r.unshift(putBack)
        }
      })

      const expected = [
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy',
        'xxxxxxxxxx',
        'yyyyy'
      ]

      r.on('end', () => {
        expect(seen).toEqual(expected)
        resolve()
      })
    }))
})
