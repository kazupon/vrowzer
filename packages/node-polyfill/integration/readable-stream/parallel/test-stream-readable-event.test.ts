import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-event', () => {
  it('not reading when readable is added triggers readable event', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        highWaterMark: 3
      })
      r._read = mustNotCall() as () => void
      r.push(Buffer.from('blerg'))
      setTimeout(function () {
        expect(!(r as any)._readableState.reading).toBeTruthy()
        r.on(
          'readable',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      }, 1)
    }))

  it('readable is re-emitted if there is already a length while reading', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        highWaterMark: 3
      })
      r._read = mustCall() as () => void
      r.push(Buffer.from('bl'))
      setTimeout(function () {
        expect((r as any)._readableState.reading).toBeTruthy()
        r.on(
          'readable',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      }, 1)
    }))

  it('not reading when stream has not passed highWaterMark but has reached EOF', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        highWaterMark: 30
      })
      r._read = mustNotCall() as () => void
      r.push(Buffer.from('blerg'))
      r.push(null)
      setTimeout(function () {
        expect(!(r as any)._readableState.reading).toBeTruthy()
        r.on(
          'readable',
          mustCall(() => {
            resolve()
          }) as (...args: unknown[]) => void
        )
      }, 1)
    }))

  it('pushing empty string in non-objectMode triggers next read', () =>
    new Promise<void>(resolve => {
      const underlyingData = ['', 'x', 'y', '', 'z']
      const expected = underlyingData.filter(data => data)
      const result: string[] = []
      const r = new Readable({
        encoding: 'utf8'
      })
      r._read = function () {
        process.nextTick(() => {
          if (!underlyingData.length) {
            this.push(null)
          } else {
            this.push(underlyingData.shift()!)
          }
        })
      }
      r.on('readable', () => {
        const data = r.read()
        if (data !== null) {
          result.push(data as string)
        }
      })
      r.on(
        'end',
        mustCall(() => {
          expect(result).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('removeAllListeners clears all events', () => {
    const r = new Readable()
    r._read = function () {}
    r.on('data', function () {})
    r.removeAllListeners()
    expect(r.eventNames().length).toBe(0)
  })
})
