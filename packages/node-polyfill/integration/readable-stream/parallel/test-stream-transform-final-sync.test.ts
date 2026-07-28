import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Transform } from 'readable-stream'

describe('test-stream-transform-final-sync', () => {
  it('should call transform, final, flush in correct order', () =>
    new Promise<void>(resolve => {
      let state = 0

      const t = new Transform({
        objectMode: true,
        transform: mustCall(function (this: Transform, chunk: number, _: string, next: () => void) {
          // transformCallback part 1
          expect(++state).toBe(chunk)
          this.push(state)
          // transformCallback part 2
          expect(++state).toBe(chunk + 2)
          process.nextTick(next)
        }, 3) as (chunk: unknown, encoding: string, cb: () => void) => void,
        final: mustCall(function (done: () => void) {
          state++
          // finalCallback part 1
          expect(state).toBe(10)
          state++
          // finalCallback part 2
          expect(state).toBe(11)
          done()
        }, 1) as (cb: () => void) => void,
        flush: mustCall(function (done: () => void) {
          state++
          // flushCallback part 1
          expect(state).toBe(12)
          process.nextTick(function () {
            state++
            // flushCallback part 2
            expect(state).toBe(13)
            done()
          })
        }, 1) as (cb: () => void) => void
      })
      t.on(
        'finish',
        mustCall(function () {
          state++
          // finishListener
          expect(state).toBe(15)
        }, 1) as (...args: unknown[]) => void
      )
      t.on(
        'end',
        mustCall(function () {
          state++
          // endEvent
          expect(state).toBe(16)
          resolve()
        }, 1) as (...args: unknown[]) => void
      )
      t.on(
        'data',
        mustCall(function (d: number) {
          // dataListener
          expect(++state).toBe(d + 1)
        }, 3) as (...args: unknown[]) => void
      )
      t.write(1)
      t.write(4)
      t.end(
        7,
        mustCall(function () {
          state++
          // endMethodCallback
          expect(state).toBe(14)
        }, 1) as () => void
      )
    }))
})
