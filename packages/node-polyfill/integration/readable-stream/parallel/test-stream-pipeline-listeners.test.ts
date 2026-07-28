import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { pipeline, Duplex, PassThrough, Writable } from 'readable-stream'

describe('test-stream-pipeline-listeners', () => {
  it('should remove listeners on last stream if it is readable', () =>
    new Promise<void>(resolve => {
      const originalListeners = process.listeners('uncaughtException')
      process.removeAllListeners('uncaughtException')

      let uncaughtCount = 0
      const uncaughtHandler = mustCall((err: Error) => {
        expect(err.message).toBe('no way')
        uncaughtCount++
        if (uncaughtCount >= 2) {
          // Restore original listeners
          process.removeAllListeners('uncaughtException')
          for (const listener of originalListeners) {
            process.on('uncaughtException', listener)
          }
          resolve()
        }
      }, 2) as (...args: unknown[]) => void

      process.on('uncaughtException', uncaughtHandler)

      // Ensure that listeners is removed if last stream is readable
      // And other stream's listeners unchanged
      const a = new PassThrough()
      a.end('foobar')
      const b = new Duplex({
        write(_chunk: Buffer, _encoding: string, callback: () => void) {
          callback()
        }
      })
      pipeline(
        a,
        b,
        mustCall((error: Error | null) => {
          if (error) {
            throw error
          }
          expect(a.listenerCount('error')).toBeGreaterThan(0)
          expect(b.listenerCount('error')).toBe(0)
          setTimeout(() => {
            expect(b.listenerCount('error')).toBe(0)
            b.destroy(new Error('no way'))
          }, 100)
        }) as (...args: unknown[]) => void
      )

      // Async generators
      const c = new PassThrough()
      c.end('foobar')
      const d = pipeline(
        c,
        async function* (source: AsyncIterable<Buffer>) {
          for await (const chunk of source) {
            yield String(chunk).toUpperCase()
          }
        },
        mustCall((error: Error | null) => {
          if (error) {
            throw error
          }
          expect(c.listenerCount('error')).toBeGreaterThan(0)
          expect(d.listenerCount('error')).toBe(0)
          setTimeout(() => {
            expect(b.listenerCount('error')).toBe(0)
            d.destroy(new Error('no way'))
          }, 100)
        }) as (...args: unknown[]) => void
      )

      // If last stream is not readable, will not throw and remove listeners
      const e = new PassThrough()
      e.end('foobar')
      const f = new Writable({
        write(_chunk: Buffer, _encoding: string, callback: () => void) {
          callback()
        }
      })
      pipeline(
        e,
        f,
        mustCall((error: Error | null) => {
          if (error) {
            throw error
          }
          expect(e.listenerCount('error')).toBeGreaterThan(0)
          expect(f.listenerCount('error')).toBeGreaterThan(0)
          setTimeout(() => {
            expect(f.listenerCount('error')).toBeGreaterThan(0)
            f.destroy(new Error('no way'))
          }, 100)
        }) as (...args: unknown[]) => void
      )
    }))
})
