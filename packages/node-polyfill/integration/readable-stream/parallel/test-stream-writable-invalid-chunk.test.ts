import { describe, it, expect } from 'vitest'
import { mustNotCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

function testWriteType(val: unknown, objectMode: boolean, code?: string) {
  const writable = new Writable({
    objectMode,
    write: () => {}
  })
  writable.on('error', mustNotCall() as (...args: unknown[]) => void)
  if (code) {
    expect(() => {
      writable.write(val)
    }).toThrow(
      expect.objectContaining({
        code
      })
    )
  } else {
    writable.write(val)
  }
}

describe('test-stream-writable-invalid-chunk', () => {
  it('non-object mode rejects invalid types', () => {
    testWriteType([], false, 'ERR_INVALID_ARG_TYPE')
    testWriteType({}, false, 'ERR_INVALID_ARG_TYPE')
    testWriteType(0, false, 'ERR_INVALID_ARG_TYPE')
    testWriteType(true, false, 'ERR_INVALID_ARG_TYPE')
    testWriteType(0.0, false, 'ERR_INVALID_ARG_TYPE')
    testWriteType(undefined, false, 'ERR_INVALID_ARG_TYPE')
    testWriteType(null, false, 'ERR_STREAM_NULL_VALUES')
  })

  it('object mode accepts various types except null', () => {
    testWriteType([], true)
    testWriteType({}, true)
    testWriteType(0, true)
    testWriteType(true, true)
    testWriteType(0.0, true)
    testWriteType(undefined, true)
    testWriteType(null, true, 'ERR_STREAM_NULL_VALUES')
  })
})
