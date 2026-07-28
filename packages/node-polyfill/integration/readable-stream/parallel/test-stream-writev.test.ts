import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-writev', () => {
  const queue: Array<[boolean, boolean, boolean]> = []
  for (let decode = 0; decode < 2; decode++) {
    for (let uncork = 0; uncork < 2; uncork++) {
      for (let multi = 0; multi < 2; multi++) {
        queue.push([!!decode, !!uncork, !!multi])
      }
    }
  }

  for (const [decode, uncork, multi] of queue) {
    it(`decode=${decode} uncork=${uncork} multi=${multi}`, () =>
      new Promise<void>(resolve => {
        let counter = 0
        let expectCount = 0
        function cnt(_msg: string) {
          expectCount++
          const expected = expectCount
          return function (er?: Error | null) {
            if (er) {
              throw er
            }
            counter++
            expect(counter).toBe(expected)
          }
        }
        const w = new Writable({
          decodeStrings: decode
        })
        w._write = mustNotCall('Should not call _write') as (
          chunk: unknown,
          encoding: string,
          cb: () => void
        ) => void
        const expectChunks = decode
          ? [
              { encoding: 'buffer', chunk: [104, 101, 108, 108, 111, 44, 32] },
              { encoding: 'buffer', chunk: [119, 111, 114, 108, 100] },
              { encoding: 'buffer', chunk: [33] },
              { encoding: 'buffer', chunk: [10, 97, 110, 100, 32, 116, 104, 101, 110, 46, 46, 46] },
              {
                encoding: 'buffer',
                chunk: [250, 206, 190, 167, 222, 173, 190, 239, 222, 202, 251, 173]
              }
            ]
          : [
              { encoding: 'ascii', chunk: 'hello, ' },
              { encoding: 'utf8', chunk: 'world' },
              { encoding: 'buffer', chunk: [33] },
              { encoding: 'latin1', chunk: '\nand then...' },
              { encoding: 'hex', chunk: 'facebea7deadbeefdecafbad' }
            ]
        let actualChunks: Array<{ encoding: string; chunk: unknown }>
        w._writev = function (chunks, cb) {
          actualChunks = chunks.map(function (chunk) {
            return {
              encoding: chunk.encoding,
              chunk: Buffer.isBuffer(chunk.chunk)
                ? Array.prototype.slice.call(chunk.chunk)
                : chunk.chunk
            }
          })
          cb()
        }
        w.cork()
        w.write('hello, ', 'ascii', cnt('hello'))
        w.write('world', 'utf8', cnt('world'))
        if (multi) {
          w.cork()
        }
        w.write(Buffer.from('!'), 'buffer' as BufferEncoding, cnt('!'))
        w.write('\nand then...', 'latin1', cnt('and then'))
        if (multi) {
          w.uncork()
        }
        w.write('facebea7deadbeefdecafbad', 'hex', cnt('hex'))
        if (uncork) {
          w.uncork()
        }
        w.end(cnt('end'))
        w.on('finish', function () {
          cnt('finish')()
          expect(actualChunks).toStrictEqual(expectChunks)
          resolve()
        })
      }))
  }

  it('writev option', () =>
    new Promise<void>(resolve => {
      const w = new Writable({
        writev: mustCall(function (_chunks: unknown[], cb: () => void) {
          cb()
        }) as any
      })
      w.write(
        'asd',
        mustCall(() => {
          resolve()
        }) as () => void
      )
    }))
})
