import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-end-paused', () => {
  it('should not miss end event for paused 0-length streams', () =>
    new Promise<void>(resolve => {
      const stream = new Readable()
      let calledRead = false
      stream._read = function () {
        expect(calledRead).toBe(false)
        calledRead = true
        this.push(null)
      }
      stream.on('data', function () {
        throw new Error('should not ever get data')
      })
      stream.pause()
      setTimeout(
        mustCall(function () {
          stream.on(
            'end',
            mustCall(() => {
              expect(calledRead).toBe(true)
              resolve()
            }) as (...args: unknown[]) => void
          )
          stream.resume()
        }) as () => void,
        1
      )
    }))
})
