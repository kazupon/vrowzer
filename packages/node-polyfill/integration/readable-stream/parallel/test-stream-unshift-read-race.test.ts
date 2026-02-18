import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-unshift-read-race', () => {
  // This test verifies that:
  // 1. unshift() does not cause colliding _read() calls.
  // 2. unshift() after the EOF signalling null is ok.
  // 3. push() after the EOF signaling null is an error.
  // 4. _read() is not called after pushing the EOF null chunk.
  it('unshift and read race condition', () =>
    new Promise<void>(resolve => {
      const hwm = 10
      const r = new Readable({
        highWaterMark: hwm,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: false
      })
      const chunks = 10
      const data = Buffer.allocUnsafe(chunks * hwm + Math.ceil(hwm / 2))
      for (let i = 0; i < data.length; i++) {
        const c = 'asdf'.charCodeAt(i % 4)
        data[i] = c
      }

      let pos = 0
      let pushedNull = false
      const w = new Writable()
      const written: string[] = []

      r._read = function (n) {
        expect(pushedNull).toBe(false)

        // Every third chunk is fast
        push(!(chunks % 3))
        function push(fast: boolean) {
          expect(pushedNull).toBe(false)
          const c = pos >= data.length ? null : data.slice(pos, pos + n)
          pushedNull = c === null
          if (fast) {
            pos += n
            r.push(c)
            if (c === null) {
              pushError()
            }
          } else {
            setTimeout(function () {
              pos += n
              r.push(c)
              if (c === null) {
                pushError()
              }
            }, 1)
          }
        }
      }

      function pushError() {
        r.unshift(Buffer.allocUnsafe(1))
        w.end()
        expect(() => {
          r.push(Buffer.allocUnsafe(1))
        }).toThrow(
          expect.objectContaining({
            code: 'ERR_STREAM_PUSH_AFTER_EOF',
            name: 'Error',
            message: 'stream.push() after EOF'
          })
        )
      }

      w._write = function (chunk, _encoding, cb) {
        written.push(chunk.toString())
        cb()
      }

      r.on('end', mustNotCall() as (...args: unknown[]) => void)
      r.on('readable', function () {
        let chunk
        while (null !== (chunk = r.read(10))) {
          w.write(chunk)
          if ((chunk as Buffer).length > 4) {
            r.unshift(Buffer.from('1234'))
          }
        }
      })

      w.on(
        'finish',
        mustCall(function () {
          // Each chunk should start with 1234, and then be asfdasdfasdf...
          // The first got pulled out before the first unshift('1234'), so it's
          // lacking that piece.
          expect(written[0]).toBe('asdfasdfas')
          let asdf = 'd'
          for (let i = 1; i < written.length; i++) {
            expect(written[i]!.slice(0, 4)).toBe('1234')
            for (let j = 4; j < written[i]!.length; j++) {
              const c = written[i]!.charAt(j)
              expect(c).toBe(asdf)
              switch (asdf) {
                case 'a':
                  asdf = 's'
                  break
                case 's':
                  asdf = 'd'
                  break
                case 'd':
                  asdf = 'f'
                  break
                case 'f':
                  asdf = 'a'
                  break
              }
            }
          }
          expect(written.length).toBe(18)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
