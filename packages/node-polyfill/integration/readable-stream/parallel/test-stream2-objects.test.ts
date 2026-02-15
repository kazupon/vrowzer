import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

function toArray(callback: (list: any[]) => void) {
  const stream = new Writable({
    objectMode: true
  })
  const list: any[] = []
  ;(stream as any).write = function (chunk: any) {
    list.push(chunk)
  }
  ;(stream as any).end = mustCall(function () {
    callback(list)
  }) as (...args: unknown[]) => void
  return stream
}

function fromArray(list: any[]) {
  const r = new Readable({
    objectMode: true
  })
  r._read = mustNotCall() as () => void
  list.forEach(function (chunk) {
    r.push(chunk)
  })
  r.push(null)
  return r
}

describe('test-stream2-objects', () => {
  it('should read objects from the stream', () => {
    const r = fromArray([{ one: '1' }, { two: '2' }])
    const v1 = r.read()
    const v2 = r.read()
    const v3 = r.read()
    expect(v1).toStrictEqual({ one: '1' })
    expect(v2).toStrictEqual({ two: '2' })
    expect(v3).toBe(null)
  })

  it('should pipe objects into the stream', () =>
    new Promise<void>(resolve => {
      const r = fromArray([{ one: '1' }, { two: '2' }])
      r.pipe(
        toArray(
          mustCall(function (list: any[]) {
            expect(list).toStrictEqual([{ one: '1' }, { two: '2' }])
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should ignore read(n) in object mode', () => {
    const r = fromArray([{ one: '1' }, { two: '2' }])
    const value = r.read(2)
    expect(value).toStrictEqual({ one: '1' })
  })

  it('should synchronously read objects', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      const list = [{ one: '1' }, { two: '2' }]
      r._read = function () {
        const item = list.shift()
        r.push(item || null)
      }
      r.pipe(
        toArray(
          mustCall(function (result: any[]) {
            expect(result).toStrictEqual([{ one: '1' }, { two: '2' }])
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should asynchronously read objects', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      const list = [{ one: '1' }, { two: '2' }]
      r._read = function () {
        const item = list.shift()
        process.nextTick(function () {
          r.push(item || null)
        })
      }
      r.pipe(
        toArray(
          mustCall(function (result: any[]) {
            expect(result).toStrictEqual([{ one: '1' }, { two: '2' }])
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should read strings as objects', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      r._read = mustNotCall() as () => void
      const list = ['one', 'two', 'three']
      list.forEach(function (str) {
        r.push(str)
      })
      r.push(null)
      r.pipe(
        toArray(
          mustCall(function (array: any[]) {
            expect(array).toStrictEqual(list)
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should handle read(0) in object mode', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      r._read = mustNotCall() as () => void
      r.push('foobar')
      r.push(null)
      r.pipe(
        toArray(
          mustCall(function (array: any[]) {
            expect(array).toStrictEqual(['foobar'])
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should push falsey values', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      r._read = mustNotCall() as () => void
      r.push(false)
      r.push(0)
      r.push('')
      r.push(null)
      r.pipe(
        toArray(
          mustCall(function (array: any[]) {
            expect(array).toStrictEqual([false, 0, ''])
            resolve()
          }) as (...args: unknown[]) => void
        )
      )
    }))

  it('should respect high watermark for _read calls', () => {
    const r = new Readable({
      highWaterMark: 6,
      objectMode: true
    })
    let calls = 0
    const list = ['1', '2', '3', '4', '5', '6', '7', '8']
    r._read = function () {
      calls++
    }
    list.forEach(function (c) {
      r.push(c)
    })
    const v = r.read()
    expect(calls).toBe(0)
    expect(v).toBe('1')
    const v2 = r.read()
    expect(v2).toBe('2')
    const v3 = r.read()
    expect(v3).toBe('3')
    expect(calls).toBe(1)
  })

  it('should respect high watermark for push return value', () => {
    const r = new Readable({
      highWaterMark: 6,
      objectMode: true
    })
    r._read = mustNotCall() as () => void
    for (let i = 0; i < 6; i++) {
      const bool = r.push(i)
      expect(bool).toBe(i !== 5)
    }
  })

  it('should write objects to writable stream', () =>
    new Promise<void>(resolve => {
      const w = new Writable({ objectMode: true })
      w._write = function (chunk, _encoding, cb) {
        expect(chunk).toStrictEqual({ foo: 'bar' })
        cb()
      }
      w.on(
        'finish',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.write({ foo: 'bar' })
      w.end()
    }))

  it('should write multiple objects to writable stream', () =>
    new Promise<void>(resolve => {
      const w = new Writable({ objectMode: true })
      const list: any[] = []
      w._write = function (chunk, _encoding, cb) {
        list.push(chunk)
        cb()
      }
      w.on(
        'finish',
        mustCall(function () {
          expect(list).toStrictEqual([0, 1, 2, 3, 4])
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.write(0)
      w.write(1)
      w.write(2)
      w.write(3)
      w.write(4)
      w.end()
    }))

  it('should write strings as objects', () =>
    new Promise<void>(resolve => {
      const w = new Writable({ objectMode: true })
      const list: any[] = []
      w._write = function (chunk, _encoding, cb) {
        list.push(chunk)
        process.nextTick(cb)
      }
      w.on(
        'finish',
        mustCall(function () {
          expect(list).toStrictEqual(['0', '1', '2', '3', '4'])
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.write('0')
      w.write('1')
      w.write('2')
      w.write('3')
      w.write('4')
      w.end()
    }))

  it('should buffer finish until callback is called', () =>
    new Promise<void>(resolve => {
      const w = new Writable({ objectMode: true })
      let called = false
      w._write = function (chunk, _encoding, cb) {
        expect(chunk).toBe('foo')
        process.nextTick(function () {
          called = true
          cb()
        })
      }
      w.on(
        'finish',
        mustCall(function () {
          expect(called).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
      w.write('foo')
      w.end()
    }))
})
