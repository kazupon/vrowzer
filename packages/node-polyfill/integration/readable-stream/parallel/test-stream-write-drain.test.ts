import { describe, it } from 'vitest'
import { mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

describe('test-stream-write-drain', () => {
  it('should not emit drain if ended', () => {
    const w = new Writable({
      write(_data, _enc, cb) {
        process.nextTick(cb)
      },
      highWaterMark: 1
    })
    w.on('drain', mustNotCall() as (...args: unknown[]) => void)
    w.write('asd')
    w.end()
  })
})
