import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'
import EE from 'events'

describe('test-stream2-readable-wrap-destroy', () => {
  const oldStream = new EE()
  ;(oldStream as any).pause = () => {}
  ;(oldStream as any).resume = () => {}

  it('should call destroy on wrapped stream when destroy event is emitted', () => {
    new Readable({
      // @ts-ignore - autoDestroy exists at runtime
      autoDestroy: false,
      destroy: mustCall() as (err: Error | null, cb: (err: Error | null) => void) => void
    }).wrap(oldStream as any)
    oldStream.emit('destroy')
  })

  it('should call destroy on wrapped stream when close event is emitted', () => {
    new Readable({
      // @ts-ignore - autoDestroy exists at runtime
      autoDestroy: false,
      destroy: mustCall() as (err: Error | null, cb: (err: Error | null) => void) => void
    }).wrap(oldStream as any)
    oldStream.emit('close')
  })
})
