import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable, Transform } from 'readable-stream'

describe('test-stream-objectmode-undefined', () => {
  it('Readable in objectMode can push undefined', () =>
    new Promise<void>(resolve => {
      const stream = new Readable({
        objectMode: true,
        read: mustCall(() => {
          stream.push(undefined)
          stream.push(null)
        }) as () => void
      })
      stream.on(
        'data',
        mustCall((chunk: unknown) => {
          expect(chunk).toBe(undefined)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('Writable in objectMode can write undefined', () =>
    new Promise<void>(resolve => {
      const stream = new Writable({
        objectMode: true,
        write: mustCall((chunk: unknown) => {
          expect(chunk).toBe(undefined)
          resolve()
        }) as (...args: unknown[]) => void
      })
      stream.write(undefined)
    }))

  it('Transform in objectMode can transform undefined', () =>
    new Promise<void>(resolve => {
      const stream = new Transform({
        objectMode: true,
        transform: mustCall((chunk: unknown) => {
          stream.push(chunk)
        }) as (...args: unknown[]) => void
      })
      stream.on(
        'data',
        mustCall((chunk: unknown) => {
          expect(chunk).toBe(undefined)
          resolve()
        }) as (...args: unknown[]) => void
      )
      stream.write(undefined)
    }))
})
