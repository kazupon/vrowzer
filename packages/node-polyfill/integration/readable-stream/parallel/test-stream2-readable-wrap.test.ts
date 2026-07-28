import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'
import EE from 'events'

function runTest(highWaterMark: number, objectMode: boolean, produce: () => any) {
  return new Promise<void>(resolve => {
    const old = new EE() as any
    const r = new Readable({
      highWaterMark,
      objectMode
    })
    expect(r).toBe(r.wrap(old))
    r.on('end', mustCall() as (...args: unknown[]) => void)

    old.pause = function () {
      old.emit('pause')
      flowing = false
    }

    old.resume = function () {
      old.emit('resume')
      flow()
    }

    // Make sure pause is only emitted once.
    let pausing = false
    r.on('pause', () => {
      expect(pausing).toBe(false)
      pausing = true
      process.nextTick(() => {
        pausing = false
      })
    })

    let flowing: boolean
    let chunks = 10
    let oldEnded = false
    const expected: any[] = []

    function flow() {
      flowing = true
      while (flowing && chunks-- > 0) {
        const item = produce()
        expected.push(item)
        old.emit('data', item)
      }
      if (chunks <= 0) {
        oldEnded = true
        old.emit('end')
      }
    }

    const w = new Writable({
      highWaterMark: highWaterMark * 2,
      objectMode
    })
    const written: any[] = []
    w._write = function (chunk, _encoding, cb) {
      written.push(chunk)
      setTimeout(cb, 1)
    }

    w.on(
      'finish',
      mustCall(function () {
        expect(oldEnded).toBe(true)
        expect(written).toStrictEqual(expected)
        resolve()
      }) as (...args: unknown[]) => void
    )

    r.pipe(w)
    flow()
  })
}

describe('test-stream2-readable-wrap', () => {
  it('should wrap old-style stream with buffers (hwm=100)', () =>
    runTest(100, false, function () {
      return Buffer.allocUnsafe(100)
    }))

  it('should wrap old-style stream with string buffers (hwm=10)', () =>
    runTest(10, false, function () {
      return Buffer.from('xxxxxxxxxx')
    }))

  it('should wrap old-style stream with objects (hwm=1)', () =>
    runTest(1, true, function () {
      return { foo: 'bar' }
    }))

  it('should wrap old-style stream with mixed object chunks (hwm=1)', () => {
    const objectChunks: any[] = [5, 'a', false, 0, '', 'xyz', { x: 4 }, 7, [], 555]
    return runTest(1, true, function () {
      return objectChunks.shift()
    })
  })
})
