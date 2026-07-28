import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-add-chunk-during-data', () => {
  for (const method of ['push', 'unshift'] as const) {
    it(`should allow ${method} from data listener`, () =>
      new Promise<void>(resolve => {
        const r = new Readable({
          read() {}
        })
        r.once(
          'data',
          mustCall((chunk: Buffer) => {
            expect(r.readableLength).toBe(0)
            r[method](chunk)
            expect(r.readableLength).toBe(chunk.length)
            r.on(
              'data',
              mustCall((chunk: Buffer) => {
                expect(chunk.toString()).toBe('Hello, world')
                resolve()
              }) as (...args: unknown[]) => void
            )
          }) as (...args: unknown[]) => void
        )
        r.push('Hello, world')
      }))
  }
})
