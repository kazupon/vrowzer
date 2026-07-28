import { describe, it } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Writable, Readable } from 'readable-stream'

describe('test-stream-error-once', () => {
  it('writable emits error only once after end', () =>
    new Promise<void>(resolve => {
      const writable = new Writable()
      writable.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      writable.end()
      writable.write('h')
      writable.write('h')
    }))

  it('readable emits error only once after push null', () =>
    new Promise<void>(resolve => {
      const readable = new Readable()
      readable.on(
        'error',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
      readable.push(null)
      readable.push('h')
      readable.push('h')
    }))
})
