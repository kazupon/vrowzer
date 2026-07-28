import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'
import EE from 'events'

class LegacyStream extends EE {
  pause() {}
  resume() {}
}

describe('test-stream2-readable-wrap-error', () => {
  it('wrap with autoDestroy true should set errorEmitted and destroyed', () =>
    new Promise<void>(resolve => {
      const err = new Error()
      const oldStream = new LegacyStream()
      // @ts-ignore - autoDestroy exists at runtime
      const r = new Readable({ autoDestroy: true })
        // @ts-ignore - wrap accepts LegacyStream at runtime
        .wrap(oldStream)
        .on(
          'error',
          mustCall(() => {
            expect((r as any)._readableState.errorEmitted).toBe(true)
            expect((r as any)._readableState.errored).toBe(err)
            expect(r.destroyed).toBe(true)
            resolve()
          }) as (...args: unknown[]) => void
        )
      oldStream.emit('error', err)
    }))

  it('wrap with autoDestroy false should set errorEmitted but not destroyed', () =>
    new Promise<void>(resolve => {
      const err = new Error()
      const oldStream = new LegacyStream()
      // @ts-ignore - autoDestroy exists at runtime
      const r = new Readable({ autoDestroy: false })
        // @ts-ignore - wrap accepts LegacyStream at runtime
        .wrap(oldStream)
        .on(
          'error',
          mustCall(() => {
            expect((r as any)._readableState.errorEmitted).toBe(true)
            expect((r as any)._readableState.errored).toBe(err)
            expect(r.destroyed).toBe(false)
            resolve()
          }) as (...args: unknown[]) => void
        )
      oldStream.emit('error', err)
    }))
})
