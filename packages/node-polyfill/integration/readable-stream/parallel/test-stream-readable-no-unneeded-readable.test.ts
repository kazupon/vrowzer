import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, PassThrough } from 'readable-stream'

describe('test-stream-readable-no-unneeded-readable', () => {
  function test(r: Readable) {
    return new Promise<void>(resolve => {
      const wrapper = new Readable({
        read: () => {
          let data = r.read()
          if (data) {
            wrapper.push(data)
            return
          }
          r.once('readable', function () {
            data = r.read()
            if (data) {
              wrapper.push(data)
            }
            // else: the end event should fire
          })
        }
      })
      r.once('end', function () {
        wrapper.push(null)
      })
      wrapper.resume()
      wrapper.once(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    })
  }

  it('piped PassThrough source with push then null', () => {
    const source = new Readable({
      read: () => {}
    })
    source.push('foo')
    source.push('bar')
    source.push(null)
    const pt = source.pipe(new PassThrough())
    return test(pt)
  })

  it('readable with sync push and async null', () => {
    const pushChunks = ['foo', 'bar']
    const r = new Readable({
      read: () => {
        const chunk = pushChunks.shift()
        if (chunk) {
          // synchronous call
          r.push(chunk)
        } else {
          // asynchronous call
          process.nextTick(() => r.push(null))
        }
      }
    })
    return test(r)
  })
})
