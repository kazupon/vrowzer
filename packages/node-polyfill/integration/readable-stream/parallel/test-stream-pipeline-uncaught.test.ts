import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustSucceed } from '../common/index.ts'
import { pipeline, PassThrough } from 'readable-stream'

describe('test-stream-pipeline-uncaught', () => {
  // Ensure that pipeline that ends with Promise
  // still propagates error to uncaughtException.
  it('should propagate thrown error to uncaughtException', () =>
    new Promise<void>(resolve => {
      const originalListeners = process.listeners('uncaughtException')
      process.removeAllListeners('uncaughtException')

      process.on(
        'uncaughtException',
        mustCall((err: Error) => {
          expect(err.message).toBe('error')
          // Restore original listeners
          process.removeAllListeners('uncaughtException')
          for (const listener of originalListeners) {
            process.on('uncaughtException', listener)
          }
          resolve()
        }) as (...args: unknown[]) => void
      )

      const s = new PassThrough()
      s.end('data')
      pipeline(
        s,
        async function (source: AsyncIterable<Buffer>) {
          for await (const _chunk of source) {
          } // eslint-disable-line no-unused-vars, no-empty
        },
        mustSucceed(() => {
          throw new Error('error')
        }) as (...args: unknown[]) => void
      )
    }))
})
