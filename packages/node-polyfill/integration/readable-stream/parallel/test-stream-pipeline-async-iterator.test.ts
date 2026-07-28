import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, PassThrough, pipeline } from 'readable-stream'

describe('test-stream-pipeline-async-iterator', () => {
  it('pipeline async iterator collects data before source destroy error', () =>
    new Promise<void>(resolve => {
      const _err = new Error('kaboom')
      const source = new Readable({
        read() {}
      })
      source.push('hello')
      source.push('world')
      setImmediate(() => {
        source.destroy(_err)
      })
      const iterator = pipeline(source, new PassThrough(), () => {})
      iterator.setEncoding('utf8')
      ;(async () => {
        for await (const k of iterator) {
          expect(k).toBe('helloworld')
        }
      })().catch(
        mustCall((err: Error) => {
          expect(err).toBe(_err)
          resolve()
        }) as (err: unknown) => void
      )
    }))
})
