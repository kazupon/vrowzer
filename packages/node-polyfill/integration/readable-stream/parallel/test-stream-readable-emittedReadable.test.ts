import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-emittedReadable', () => {
  it('emittedReadable state changes correctly during readable events', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read: () => {}
      })

      // Initialized to false.
      expect((readable as any)._readableState.emittedReadable).toBe(false)
      const expected = [Buffer.from('foobar'), Buffer.from('quo'), null]
      readable.on(
        'readable',
        mustCall(() => {
          // emittedReadable should be true when the readable event is emitted
          expect((readable as any)._readableState.emittedReadable).toBe(true)
          expect(readable.read()).toEqual(expected.shift())
          // emittedReadable is reset to false during read()
          expect((readable as any)._readableState.emittedReadable).toBe(false)
        }, 3) as (...args: unknown[]) => void
      )

      // When the first readable listener is just attached,
      // emittedReadable should be false
      expect((readable as any)._readableState.emittedReadable).toBe(false)

      // These trigger a single 'readable', as things are batched up
      process.nextTick(
        mustCall(() => {
          readable.push('foo')
        }) as (...args: unknown[]) => void
      )
      process.nextTick(
        mustCall(() => {
          readable.push('bar')
        }) as (...args: unknown[]) => void
      )

      // These triggers two readable events
      setImmediate(
        mustCall(() => {
          readable.push('quo')
          process.nextTick(
            mustCall(() => {
              readable.push(null)
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )

      readable.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('emittedReadable is true during read(0)', () =>
    new Promise<void>(resolve => {
      const noRead = new Readable({
        read: () => {}
      })
      noRead.on(
        'readable',
        mustCall(() => {
          // emittedReadable should be true when the readable event is emitted
          expect((noRead as any)._readableState.emittedReadable).toBe(true)
          noRead.read(0)
          // emittedReadable is not reset during read(0)
          expect((noRead as any)._readableState.emittedReadable).toBe(true)
        }) as (...args: unknown[]) => void
      )
      noRead.push('foo')
      noRead.push(null)
      // Resolve after allowing time for the readable event to fire
      setTimeout(() => {
        resolve()
      }, 50)
    }))

  it('emittedReadable is always false in flowing mode', () =>
    new Promise<void>(resolve => {
      const flowing = new Readable({
        read: () => {}
      })
      flowing.on(
        'data',
        mustCall(() => {
          // When in flowing mode, emittedReadable is always false.
          expect((flowing as any)._readableState.emittedReadable).toBe(false)
          flowing.read()
          expect((flowing as any)._readableState.emittedReadable).toBe(false)
        }, 3) as (...args: unknown[]) => void
      )
      flowing.push('foooo')
      flowing.push('bar')
      flowing.push('quo')
      process.nextTick(
        mustCall(() => {
          flowing.push(null)
        }) as (...args: unknown[]) => void
      )
      // Resolve after allowing time for the data events to fire
      setTimeout(() => {
        resolve()
      }, 50)
    }))
})
