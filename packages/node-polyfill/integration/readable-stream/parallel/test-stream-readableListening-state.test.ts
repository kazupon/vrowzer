import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readableListening-state', () => {
  it('readableListening is true inside readable event', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read: () => {}
      })

      // readableListening state should start in `false`.
      expect((r as any)._readableState.readableListening).toBe(false)
      r.on(
        'readable',
        mustCall(() => {
          // Inside the readable event this state should be true.
          expect((r as any)._readableState.readableListening).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.push(Buffer.from('Testing readableListening state'))
    }))

  it('readableListening is false with only data listener', () =>
    new Promise<void>(resolve => {
      const r2 = new Readable({
        read: () => {}
      })

      // readableListening state should start in `false`.
      expect((r2 as any)._readableState.readableListening).toBe(false)
      r2.on(
        'data',
        mustCall((_chunk: unknown) => {
          // readableListening should be false because we don't have
          // a `readable` listener
          expect((r2 as any)._readableState.readableListening).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
      r2.push(Buffer.from('Testing readableListening state'))
    }))
})
