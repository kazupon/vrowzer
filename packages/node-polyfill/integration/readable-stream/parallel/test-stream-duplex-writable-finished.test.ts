import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Duplex } from 'readable-stream'

describe('test-stream-duplex-writable-finished', () => {
  it('should have writableFinished on prototype', () => {
    expect(Reflect.has(Duplex.prototype, 'writableFinished')).toBe(true)
  })

  it('should set writableFinished after finish event', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex()
      duplex._write = (_chunk, _encoding, cb) => {
        expect(duplex.writableFinished).toBe(false)
        cb()
      }
      duplex.on(
        'finish',
        mustCall(() => {
          expect(duplex.writableFinished).toBe(true)
        }) as (...args: unknown[]) => void
      )
      duplex.end(
        'testing finished state',
        mustCall(() => {
          expect(duplex.writableFinished).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
