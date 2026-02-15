import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Stream } from 'readable-stream'

describe('test-stream-pipe-without-listenerCount', () => {
  it('should handle pipe when listenerCount is undefined', () => {
    const r = new Stream()
    ;(r as any).listenerCount = undefined
    const w = new Stream()
    ;(w as any).listenerCount = undefined
    w.on('pipe', function () {
      r.emit('error', new Error('Readable Error'))
      w.emit('error', new Error('Writable Error'))
    })
    r.on('error', mustCall() as (...args: unknown[]) => void)
    w.on('error', mustCall() as (...args: unknown[]) => void)
    // @ts-ignore - Stream missing WritableStream props but works at runtime
    r.pipe(w)
  })
})
