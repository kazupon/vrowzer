import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream2-decode-partial', () => {
  it('should correctly decode partial multi-byte characters', () =>
    new Promise<void>(resolve => {
      let buf = ''
      const euro = Buffer.from([0xe2, 0x82, 0xac])
      const cent = Buffer.from([0xc2, 0xa2])
      const source = Buffer.concat([euro, cent])
      const readable = new Readable({
        encoding: 'utf8'
      })
      readable.push(source.slice(0, 2))
      readable.push(source.slice(2, 4))
      readable.push(source.slice(4, 6))
      readable.push(null)
      readable.on('data', function (data) {
        buf += data
      })
      readable.on('end', function () {
        expect(buf).toBe('\u20ac\u00a2')
        resolve()
      })
    }))
})
