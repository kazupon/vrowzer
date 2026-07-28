import { describe, it } from 'vite-plus/test'
import { expectsError } from '../common/index.ts'
import { Transform } from 'readable-stream'

describe('test-stream-transform-callback-twice', () => {
  it('should error on double callback', () =>
    new Promise<void>(resolve => {
      const stream = new Transform({
        transform(_chunk, _enc, cb) {
          cb()
          cb()
        }
      })
      stream.on('error', (...args: unknown[]) => {
        ;(
          expectsError({
            name: 'Error',
            message: 'Callback called multiple times',
            code: 'ERR_MULTIPLE_CALLBACK'
          }) as Function
        )(...args)
        resolve()
      })
      stream.write('foo')
    }))
})
