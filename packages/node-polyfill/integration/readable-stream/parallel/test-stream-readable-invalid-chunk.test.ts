import { describe, it } from 'vite-plus/test'
import { expectsError } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-invalid-chunk', () => {
  function testPushArg(val: unknown) {
    return new Promise<void>(resolve => {
      const readable = new Readable({
        read: () => {}
      })
      readable.on('error', (...args: unknown[]) => {
        ;(
          expectsError({
            code: 'ERR_INVALID_ARG_TYPE',
            name: 'TypeError'
          }) as Function
        )(...args)
        resolve()
      })
      readable.push(val as any)
    })
  }

  function testUnshiftArg(val: unknown) {
    return new Promise<void>(resolve => {
      const readable = new Readable({
        read: () => {}
      })
      readable.on('error', (...args: unknown[]) => {
        ;(
          expectsError({
            code: 'ERR_INVALID_ARG_TYPE',
            name: 'TypeError'
          }) as Function
        )(...args)
        resolve()
      })
      readable.unshift(val as any)
    })
  }

  it('push with array should emit ERR_INVALID_ARG_TYPE', () => {
    return testPushArg([])
  })

  it('push with object should emit ERR_INVALID_ARG_TYPE', () => {
    return testPushArg({})
  })

  it('push with number should emit ERR_INVALID_ARG_TYPE', () => {
    return testPushArg(0)
  })

  it('unshift with array should emit ERR_INVALID_ARG_TYPE', () => {
    return testUnshiftArg([])
  })

  it('unshift with object should emit ERR_INVALID_ARG_TYPE', () => {
    return testUnshiftArg({})
  })

  it('unshift with number should emit ERR_INVALID_ARG_TYPE', () => {
    return testUnshiftArg(0)
  })
})
