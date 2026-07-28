import { describe, it } from 'vite-plus/test'
import { mustCall, expectsError } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-with-unimplemented-_read', () => {
  it('should emit error when _read is not implemented', () =>
    new Promise<void>(resolve => {
      const readable = new Readable()
      readable.read()
      readable.on(
        'error',
        expectsError({
          code: 'ERR_METHOD_NOT_IMPLEMENTED',
          name: 'Error',
          message: 'The _read() method is not implemented'
        }) as (...args: unknown[]) => void
      )
      readable.on(
        'close',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
