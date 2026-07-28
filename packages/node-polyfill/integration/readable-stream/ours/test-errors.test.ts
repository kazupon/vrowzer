import { describe, expect, it } from 'vite-plus/test'
// @ts-ignore -- internal module
import { codes as errors } from 'readable-stream/lib/ours/errors'

const checkError = (
  err: Error & { code?: string },
  Base: Function,
  name: string,
  code: string,
  message: string
) => {
  expect(err instanceof Base).toBeTruthy()
  expect(err.name).toBe(name)
  expect(err.code).toBe(code)
  expect(err.message).toBe(message)
}

describe('test-errors', () => {
  it('ERR_INVALID_ARG_VALUE with number', () => {
    checkError(
      new errors.ERR_INVALID_ARG_VALUE('name', 0),
      TypeError,
      'TypeError',
      'ERR_INVALID_ARG_VALUE',
      "The argument 'name' is invalid. Received 0"
    )
  })

  it('ERR_INVALID_ARG_VALUE with undefined', () => {
    checkError(
      new errors.ERR_INVALID_ARG_VALUE('name', undefined),
      TypeError,
      'TypeError',
      'ERR_INVALID_ARG_VALUE',
      "The argument 'name' is invalid. Received undefined"
    )
  })

  it('ERR_INVALID_ARG_TYPE with array of types', () => {
    checkError(
      new errors.ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], 0),
      TypeError,
      'TypeError',
      'ERR_INVALID_ARG_TYPE',
      'The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received type number (0)'
    )
  })

  it('ERR_INVALID_ARG_TYPE with not string', () => {
    checkError(
      new errors.ERR_INVALID_ARG_TYPE('first argument', 'not string', 'foo'),
      TypeError,
      'TypeError',
      'ERR_INVALID_ARG_TYPE',
      "The first argument must be not string. Received type string ('foo')"
    )
  })

  it('ERR_INVALID_ARG_TYPE with property', () => {
    checkError(
      new errors.ERR_INVALID_ARG_TYPE('obj.prop', 'string', undefined),
      TypeError,
      'TypeError',
      'ERR_INVALID_ARG_TYPE',
      'The "obj.prop" property must be of type string. Received undefined'
    )
  })

  it('ERR_STREAM_PUSH_AFTER_EOF', () => {
    checkError(
      new errors.ERR_STREAM_PUSH_AFTER_EOF(),
      Error,
      'Error',
      'ERR_STREAM_PUSH_AFTER_EOF',
      'stream.push() after EOF'
    )
  })

  it('ERR_METHOD_NOT_IMPLEMENTED _read()', () => {
    checkError(
      new errors.ERR_METHOD_NOT_IMPLEMENTED('_read()'),
      Error,
      'Error',
      'ERR_METHOD_NOT_IMPLEMENTED',
      'The _read() method is not implemented'
    )
  })

  it('ERR_METHOD_NOT_IMPLEMENTED _write()', () => {
    checkError(
      new errors.ERR_METHOD_NOT_IMPLEMENTED('_write()'),
      Error,
      'Error',
      'ERR_METHOD_NOT_IMPLEMENTED',
      'The _write() method is not implemented'
    )
  })

  it('ERR_STREAM_PREMATURE_CLOSE', () => {
    checkError(
      new errors.ERR_STREAM_PREMATURE_CLOSE(),
      Error,
      'Error',
      'ERR_STREAM_PREMATURE_CLOSE',
      'Premature close'
    )
  })

  it('ERR_STREAM_DESTROYED pipe', () => {
    checkError(
      new errors.ERR_STREAM_DESTROYED('pipe'),
      Error,
      'Error',
      'ERR_STREAM_DESTROYED',
      'Cannot call pipe after a stream was destroyed'
    )
  })

  it('ERR_STREAM_DESTROYED write', () => {
    checkError(
      new errors.ERR_STREAM_DESTROYED('write'),
      Error,
      'Error',
      'ERR_STREAM_DESTROYED',
      'Cannot call write after a stream was destroyed'
    )
  })

  it('ERR_MULTIPLE_CALLBACK', () => {
    checkError(
      new errors.ERR_MULTIPLE_CALLBACK(),
      Error,
      'Error',
      'ERR_MULTIPLE_CALLBACK',
      'Callback called multiple times'
    )
  })

  it('ERR_STREAM_CANNOT_PIPE', () => {
    checkError(
      new errors.ERR_STREAM_CANNOT_PIPE(),
      Error,
      'Error',
      'ERR_STREAM_CANNOT_PIPE',
      'Cannot pipe, not readable'
    )
  })

  it('ERR_STREAM_WRITE_AFTER_END', () => {
    checkError(
      new errors.ERR_STREAM_WRITE_AFTER_END(),
      Error,
      'Error',
      'ERR_STREAM_WRITE_AFTER_END',
      'write after end'
    )
  })

  it('ERR_STREAM_NULL_VALUES', () => {
    checkError(
      new errors.ERR_STREAM_NULL_VALUES(),
      TypeError,
      'TypeError',
      'ERR_STREAM_NULL_VALUES',
      'May not write null values to stream'
    )
  })

  it('ERR_UNKNOWN_ENCODING', () => {
    checkError(
      new errors.ERR_UNKNOWN_ENCODING('foo'),
      TypeError,
      'TypeError',
      'ERR_UNKNOWN_ENCODING',
      'Unknown encoding: foo'
    )
  })

  it('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', () => {
    checkError(
      new errors.ERR_STREAM_UNSHIFT_AFTER_END_EVENT(),
      Error,
      'Error',
      'ERR_STREAM_UNSHIFT_AFTER_END_EVENT',
      'stream.unshift() after end event'
    )
  })
})
