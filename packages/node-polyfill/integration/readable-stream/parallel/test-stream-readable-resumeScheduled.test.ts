import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-readable-resumeScheduled', () => {
  it('pipe() sets resumeScheduled to true', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      const w = new Writable()

      // resumeScheduled should start = `false`.
      expect((r as any)._readableState.resumeScheduled).toBe(false)

      // Calling pipe() should change the state value = true.
      r.pipe(w)
      expect((r as any)._readableState.resumeScheduled).toBe(true)
      process.nextTick(
        mustCall(() => {
          expect((r as any)._readableState.resumeScheduled).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('data listener sets resumeScheduled to true', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })

      // resumeScheduled should start = `false`.
      expect((r as any)._readableState.resumeScheduled).toBe(false)
      r.push(Buffer.from([1, 2, 3]))

      // Adding 'data' listener should change the state value
      r.on(
        'data',
        mustCall(() => {
          expect((r as any)._readableState.resumeScheduled).toBe(false)
        }) as (...args: unknown[]) => void
      )
      expect((r as any)._readableState.resumeScheduled).toBe(true)
      process.nextTick(
        mustCall(() => {
          expect((r as any)._readableState.resumeScheduled).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('resume() sets resumeScheduled to true', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })

      // resumeScheduled should start = `false`.
      expect((r as any)._readableState.resumeScheduled).toBe(false)

      // Calling resume() should change the state value.
      r.resume()
      expect((r as any)._readableState.resumeScheduled).toBe(true)
      r.on(
        'resume',
        mustCall(() => {
          // The state value should be `false` again
          expect((r as any)._readableState.resumeScheduled).toBe(false)
        }) as (...args: unknown[]) => void
      )
      process.nextTick(
        mustCall(() => {
          expect((r as any)._readableState.resumeScheduled).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
