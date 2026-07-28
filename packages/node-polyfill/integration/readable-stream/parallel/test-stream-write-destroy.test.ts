import { describe, it, expect } from 'vite-plus/test'
import { Writable } from 'readable-stream'

describe('test-stream-write-destroy', () => {
  for (const withPendingData of [false, true]) {
    for (const useEnd of [false, true]) {
      it(`withPendingData=${withPendingData} useEnd=${useEnd}`, () => {
        const callbacks: Array<(err?: Error | null) => void> = []
        const w = new Writable({
          write(_data, _enc, cb) {
            callbacks.push(cb)
          },
          highWaterMark: 1
        })
        let chunksWritten = 0
        let drains = 0
        w.on('drain', () => drains++)
        function onWrite(err?: Error | null) {
          if (err) {
            expect(w.destroyed).toBe(true)
            expect((err as Error & { code?: string }).code).toBe('ERR_STREAM_DESTROYED')
          } else {
            chunksWritten++
          }
        }
        w.write('abc', onWrite)
        expect(chunksWritten).toBe(0)
        expect(drains).toBe(0)
        callbacks.shift()!()
        expect(chunksWritten).toBe(1)
        expect(drains).toBe(1)
        if (withPendingData) {
          w.write('def', onWrite)
        }
        if (useEnd) {
          w.end('ghi', onWrite as () => void)
        } else {
          w.write('ghi', onWrite)
        }
        expect(chunksWritten).toBe(1)
        w.destroy()
        expect(chunksWritten).toBe(1)
        callbacks.shift()!()
        expect(chunksWritten).toBe(useEnd && !withPendingData ? 1 : 2)
        expect(callbacks.length).toBe(0)
        expect(drains).toBe(1)
      })
    }
  }
})
