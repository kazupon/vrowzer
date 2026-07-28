import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-needReadable', () => {
  it('should initialize needReadable to false and set after readable listener', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read: () => {}
      })

      expect((readable as any)._readableState.needReadable).toBe(false)
      readable.on(
        'readable',
        mustCall(() => {
          expect((readable as any)._readableState.needReadable).toBe(false)
          readable.read()
        }) as (...args: unknown[]) => void
      )

      expect((readable as any)._readableState.needReadable).toBe(true)
      readable.push('foo')
      readable.push(null)
      readable.on(
        'end',
        mustCall(() => {
          expect((readable as any)._readableState.needReadable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should set needReadable when async buffer is empty after read', () =>
    new Promise<void>(resolve => {
      const asyncReadable = new Readable({
        read: () => {}
      })
      asyncReadable.on(
        'readable',
        mustCall(() => {
          if (asyncReadable.read() !== null) {
            expect((asyncReadable as any)._readableState.needReadable).toBe(true)
          }
        }, 2) as (...args: unknown[]) => void
      )
      process.nextTick(
        mustCall(() => {
          asyncReadable.push('foooo')
        }) as (...args: unknown[]) => void
      )
      process.nextTick(
        mustCall(() => {
          asyncReadable.push('bar')
        }) as (...args: unknown[]) => void
      )
      setImmediate(
        mustCall(() => {
          asyncReadable.push(null)
          expect((asyncReadable as any)._readableState.needReadable).toBe(false)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should not need readable in flowing mode with buffered data', () =>
    new Promise<void>(resolve => {
      const flowing = new Readable({
        read: () => {}
      })

      flowing.push('foooo')
      flowing.push('bar')
      flowing.push('quo')
      process.nextTick(
        mustCall(() => {
          flowing.push(null)
        }) as (...args: unknown[]) => void
      )

      flowing.on(
        'data',
        mustCall(function (_data: unknown) {
          expect((flowing as any)._readableState.needReadable).toBe(false)
        }, 3) as (...args: unknown[]) => void
      )
      flowing.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should set needReadable for slow producer', () =>
    new Promise<void>(resolve => {
      const slowProducer = new Readable({
        read: () => {}
      })
      slowProducer.on(
        'readable',
        mustCall(() => {
          const chunk = slowProducer.read(8)
          const state = (slowProducer as any)._readableState
          if (chunk === null) {
            expect(state.needReadable).toBe(true)
          } else {
            expect(state.needReadable).toBe(false)
          }
        }, 4) as (...args: unknown[]) => void
      )
      process.nextTick(
        mustCall(() => {
          slowProducer.push('foo')
          process.nextTick(
            mustCall(() => {
              slowProducer.push('foo')
              process.nextTick(
                mustCall(() => {
                  slowProducer.push('foo')
                  process.nextTick(
                    mustCall(() => {
                      slowProducer.push(null)
                      resolve()
                    }) as (...args: unknown[]) => void
                  )
                }) as (...args: unknown[]) => void
              )
            }) as (...args: unknown[]) => void
          )
        }) as (...args: unknown[]) => void
      )
    }))
})
