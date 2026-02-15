import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

const MAX = 42
const BATCH = 10

describe('test-stream-readable-object-multi-push-async', () => {
  it('readable event with multi push async', () =>
    new Promise<void>(resolve => {
      let i = 0
      function fetchData(cb: (err: null, data: number[]) => void) {
        if (i > MAX) {
          setTimeout(cb, 10, null, [])
        } else {
          const array: number[] = []
          const max = i + BATCH
          for (; i < max; i++) {
            array.push(i)
          }
          setTimeout(cb, 10, null, array)
        }
      }

      const readable = new Readable({
        objectMode: true,
        read: mustCall(
          function (this: Readable) {
            fetchData((err, data) => {
              if (err) {
                this.destroy(err)
                return
              }
              if (data.length === 0) {
                this.push(null)
                return
              }
              data.forEach(d => this.push(d))
            })
          },
          Math.floor(MAX / BATCH) + 2
        ) as () => void
      })
      readable.on('readable', () => {
        while (readable.read() !== null) {
          // consume
        }
      })
      readable.on(
        'end',
        mustCall(() => {
          expect(i).toBe((Math.floor(MAX / BATCH) + 1) * BATCH)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('data event with multi push async', () =>
    new Promise<void>(resolve => {
      let i = 0
      function fetchData(cb: (err: null, data: number[]) => void) {
        if (i > MAX) {
          setTimeout(cb, 10, null, [])
        } else {
          const array: number[] = []
          const max = i + BATCH
          for (; i < max; i++) {
            array.push(i)
          }
          setTimeout(cb, 10, null, array)
        }
      }

      const readable = new Readable({
        objectMode: true,
        read: mustCall(
          function (this: Readable) {
            fetchData((err, data) => {
              if (err) {
                this.destroy(err)
                return
              }
              if (data.length === 0) {
                this.push(null)
                return
              }
              data.forEach(d => this.push(d))
            })
          },
          Math.floor(MAX / BATCH) + 2
        ) as () => void
      })
      readable.on('data', () => {
        // consume
      })
      readable.on(
        'end',
        mustCall(() => {
          expect(i).toBe((Math.floor(MAX / BATCH) + 1) * BATCH)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('data event with multi push async ending at exact boundary', () =>
    new Promise<void>(resolve => {
      let i = 0
      function fetchData(cb: (err: null, data: number[]) => void) {
        const array: number[] = []
        const max = i + BATCH
        for (; i < max; i++) {
          array.push(i)
        }
        setTimeout(cb, 10, null, array)
      }

      const readable = new Readable({
        objectMode: true,
        read: mustCall(
          function (this: Readable) {
            fetchData((err, data) => {
              if (err) {
                this.destroy(err)
                return
              }
              data.forEach(d => this.push(d))
              if (data[BATCH - 1]! >= MAX) {
                this.push(null)
              }
            })
          },
          Math.floor(MAX / BATCH) + 1
        ) as () => void
      })
      readable.on('data', () => {
        // consume
      })
      readable.on(
        'end',
        mustCall(() => {
          expect(i).toBe((Math.floor(MAX / BATCH) + 1) * BATCH)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('push null immediately without data', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        objectMode: true,
        read: mustNotCall() as () => void
      })
      readable.on('data', mustNotCall() as (...args: unknown[]) => void)
      readable.push(null)
      let nextTickPassed = false
      process.nextTick(() => {
        nextTickPassed = true
      })
      readable.on(
        'end',
        mustCall(() => {
          expect(nextTickPassed).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('push data via setImmediate', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        objectMode: true,
        read: mustCall() as () => void
      })
      readable.on('data', () => {
        // consume
      })
      readable.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      setImmediate(() => {
        readable.push('aaa')
        readable.push(null)
      })
    }))
})
