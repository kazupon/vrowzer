import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-error-unhandled', () => {
  it('should emit uncaught error when writable is destroyed with error during pipe', () =>
    new Promise<void>(resolve => {
      const originalListeners = process.listeners('uncaughtException')
      process.removeAllListeners('uncaughtException')

      process.on(
        'uncaughtException',
        mustCall((err: Error) => {
          expect(err.message).toBe('asd')
          // Restore original listeners
          process.removeAllListeners('uncaughtException')
          for (const listener of originalListeners) {
            process.on('uncaughtException', listener)
          }
          resolve()
        }) as (...args: unknown[]) => void
      )

      const r = new Readable({
        read() {
          this.push('asd')
        }
      })
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy: true,
        write() {}
      })
      r.pipe(w)
      w.destroy(new Error('asd'))
    }))
})
