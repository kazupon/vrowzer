import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-hwm-0-no-flow-data', () => {
  it('should not flow data automatically with hwm 0 and data event', () =>
    new Promise<void>(resolve => {
      const streamData: (string | null)[] = ['a', null]
      const calls: string[] = []
      const r = new Readable({
        read: mustCall(() => {
          calls.push('_read:' + streamData[0])
          process.nextTick(() => {
            calls.push('push:' + streamData[0])
            r.push(streamData.shift()!)
          })
        }, streamData.length) as () => void,
        highWaterMark: 0,
        objectMode: true
      })
      expect(r.readableFlowing).toBe(null)
      r.on(
        'readable',
        mustCall(() => {
          calls.push('readable')
        }, 2) as (...args: unknown[]) => void
      )
      expect(r.readableFlowing).toBe(false)
      r.on(
        'data',
        mustCall((data: unknown) => {
          calls.push('data:' + data)
        }, 1) as (...args: unknown[]) => void
      )
      r.on(
        'end',
        mustCall(() => {
          calls.push('end')
        }) as (...args: unknown[]) => void
      )
      expect(r.readableFlowing).toBe(false)

      setImmediate(() => {
        expect(calls).toEqual(['_read:a', 'push:a', 'readable'])

        expect(r.read()).toBe('a')
        expect(calls).toEqual(['_read:a', 'push:a', 'readable', 'data:a'])

        expect(r.read()).toBe(null)
        setImmediate(() => {
          expect(calls).toEqual([
            '_read:a',
            'push:a',
            'readable',
            'data:a',
            '_read:null',
            'push:null',
            'readable'
          ])
          expect(r.read()).toBe(null)

          expect(calls).toEqual([
            '_read:a',
            'push:a',
            'readable',
            'data:a',
            '_read:null',
            'push:null',
            'readable'
          ])
          process.nextTick(() => {
            expect(calls).toEqual([
              '_read:a',
              'push:a',
              'readable',
              'data:a',
              '_read:null',
              'push:null',
              'readable',
              'end'
            ])
            resolve()
          })
        })
      })
    }))
})
