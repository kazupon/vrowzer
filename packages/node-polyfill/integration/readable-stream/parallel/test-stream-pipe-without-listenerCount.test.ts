import { describe, expect, it } from 'vitest'
import { Stream } from 'readable-stream'

// Node v24.14+ added strict type validation to EventEmitter.listenerCount()
// static method. When listenerCount is set to undefined, pipe() now throws
// ERR_INVALID_ARG_TYPE instead of gracefully handling the error.
describe('test-stream-pipe-without-listenerCount', () => {
  it('should throw when listenerCount is undefined', () => {
    const r = new Stream()
    ;(r as any).listenerCount = undefined
    const w = new Stream()
    ;(w as any).listenerCount = undefined
    w.on('pipe', function () {
      r.emit('error', new Error('Readable Error'))
    })
    r.on('error', () => {})
    w.on('error', () => {})
    expect(() => {
      // @ts-ignore - Stream missing WritableStream props but works at runtime
      r.pipe(w)
    }).toThrow(/emitter/)
  })
})
