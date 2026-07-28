import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { PassThrough } from 'readable-stream'

describe('test-stream-await-drain-writers-in-synchronously-recursion-write', () => {
  it('pipe with highWaterMark 1 and synchronous recursive writes', () =>
    new Promise<void>(resolve => {
      const encode = new PassThrough({
        highWaterMark: 1
      })
      const decode = new PassThrough({
        highWaterMark: 1
      })
      const send = mustCall((buf: Buffer) => {
        encode.write(buf)
      }, 4) as (buf: Buffer) => void
      let i = 0
      const onData = mustCall(() => {
        if (++i === 2) {
          send(Buffer.from([0x3]))
          send(Buffer.from([0x4]))
        }
      }, 4) as (...args: unknown[]) => void
      encode.pipe(decode).on('data', onData)
      send(Buffer.from([0x1]))
      send(Buffer.from([0x2]))
      decode.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      setTimeout(() => {
        encode.end()
      }, 100)
    }))
})
