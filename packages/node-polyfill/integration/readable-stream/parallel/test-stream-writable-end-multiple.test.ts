import * as stream from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall } from '../common/index.ts'

describe('test-stream-writable-end-multiple', () => {
  it('should handle multiple end calls', () =>
    new Promise<void>(resolve => {
      const writable = new stream.Writable()
      writable._write = (_chunk, _encoding, cb) => {
        setTimeout(() => cb(), 10)
      }
      writable.end('testing ended state', mustCall() as (...args: unknown[]) => void)
      writable.end(mustCall() as (...args: unknown[]) => void)
      writable.on(
        'finish',
        mustCall(() => {
          let ticked = false
          writable.end(
            mustCall((err: Error & { code?: string }) => {
              expect(ticked).toBe(true)
              expect(err.code).toBe('ERR_STREAM_ALREADY_FINISHED')
              resolve()
            }) as (...args: unknown[]) => void
          )
          ticked = true
        }) as (...args: unknown[]) => void
      )
    }))
})
