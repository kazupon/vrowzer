import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Transform } from 'readable-stream'

describe('test-stream-transform-hwm0', () => {
  it('should respect highWaterMark 0 in objectMode', () =>
    new Promise<void>(resolve => {
      const t = new Transform({
        objectMode: true,
        highWaterMark: 0,
        transform(chunk, enc, callback) {
          // @ts-ignore - callback accepts (null, chunk, enc) at runtime
          process.nextTick(() => callback(null, chunk, enc))
        }
      })
      expect(t.write(1)).toBe(false)
      t.on(
        'drain',
        mustCall(() => {
          expect(t.write(2)).toBe(false)
          t.end()
        }) as (...args: unknown[]) => void
      )
      t.once(
        'readable',
        mustCall(() => {
          expect(t.read()).toBe(1)
          setImmediate(
            mustCall(() => {
              expect(t.read()).toBe(null)
              t.once(
                'readable',
                mustCall(() => {
                  expect(t.read()).toBe(2)
                  resolve()
                }) as (...args: unknown[]) => void
              )
            }) as () => void
          )
        }) as (...args: unknown[]) => void
      )
    }))
})
