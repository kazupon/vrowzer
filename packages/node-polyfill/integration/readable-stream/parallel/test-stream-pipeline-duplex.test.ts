import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { pipeline, Duplex, PassThrough } from 'readable-stream'

describe('test-stream-pipeline-duplex', () => {
  it('pipeline with duplex remote-local-remote triggers premature close', () =>
    new Promise<void>(resolve => {
      const remote = new PassThrough()
      const local = new Duplex({
        read() {},
        write(_chunk, _enc, callback) {
          callback()
        }
      })
      pipeline(
        remote,
        local,
        remote,
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PREMATURE_CLOSE')
          resolve()
        }) as (...args: unknown[]) => void
      )
      setImmediate(() => {
        remote.end()
      })
    }))
})
