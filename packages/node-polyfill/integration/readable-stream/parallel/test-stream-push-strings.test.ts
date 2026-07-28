import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream-push-strings', () => {
  it('should push strings and read them in correct order', () =>
    new Promise<void>(resolve => {
      class MyStream extends Readable {
        _chunks: number
        constructor(options?: ConstructorParameters<typeof Readable>[0]) {
          super(options)
          this._chunks = 3
        }
        _read(_n: number) {
          switch (this._chunks--) {
            case 0:
              return this.push(null)
            case 1:
              return setTimeout(() => {
                this.push('last chunk')
              }, 100)
            case 2:
              return this.push('second to last chunk')
            case 3:
              return process.nextTick(() => {
                this.push('first chunk')
              })
            default:
              throw new Error('?')
          }
        }
      }

      const ms = new MyStream()
      const results: string[] = []
      ms.on('readable', function () {
        let chunk
        while (null !== (chunk = ms.read())) {
          results.push(String(chunk))
        }
      })
      const expected = ['first chunksecond to last chunk', 'last chunk']
      ms.on('end', () => {
        expect(ms._chunks).toBe(-1)
        expect(results).toEqual(expected)
        resolve()
      })
    }))
})
