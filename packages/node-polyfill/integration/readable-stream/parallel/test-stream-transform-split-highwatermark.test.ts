import { describe, it, expect } from 'vitest'
import { assertThrowsCode } from '../common/index.ts'
import { Transform, Readable, Writable } from 'readable-stream'

describe('test-stream-transform-split-highwatermark', () => {
  const DEFAULT = 16 * 1024

  function testTransform(
    expectedReadableHwm: number,
    expectedWritableHwm: number,
    options: Record<string, unknown>
  ) {
    const t = new Transform(options)
    expect((t as any)._readableState.highWaterMark).toBe(expectedReadableHwm)
    expect((t as any)._writableState.highWaterMark).toBe(expectedWritableHwm)
  }

  it('should override readableHighWaterMark', () => {
    testTransform(666, DEFAULT, { readableHighWaterMark: 666 })
  })

  it('should override writableHighWaterMark', () => {
    testTransform(DEFAULT, 777, { writableHighWaterMark: 777 })
  })

  it('should override both readable and writable HWM', () => {
    testTransform(666, 777, { readableHighWaterMark: 666, writableHighWaterMark: 777 })
  })

  it('highWaterMark should override readableHighWaterMark', () => {
    testTransform(555, 555, { highWaterMark: 555, readableHighWaterMark: 666 })
  })

  it('highWaterMark should override writableHighWaterMark', () => {
    testTransform(555, 555, { highWaterMark: 555, writableHighWaterMark: 777 })
  })

  it('highWaterMark should override both', () => {
    testTransform(555, 555, {
      highWaterMark: 555,
      readableHighWaterMark: 666,
      writableHighWaterMark: 777
    })
  })

  it('undefined and null should use defaults', () => {
    ;[undefined, null].forEach(v => {
      testTransform(DEFAULT, DEFAULT, { readableHighWaterMark: v })
      testTransform(DEFAULT, DEFAULT, { writableHighWaterMark: v })
      testTransform(666, DEFAULT, { highWaterMark: v, readableHighWaterMark: 666 })
      testTransform(DEFAULT, 777, { highWaterMark: v, writableHighWaterMark: 777 })
    })
  })

  it('NaN should throw', () => {
    assertThrowsCode(() => {
      new Transform({ readableHighWaterMark: NaN })
    }, 'ERR_INVALID_ARG_VALUE')

    assertThrowsCode(() => {
      new Transform({ writableHighWaterMark: NaN })
    }, 'ERR_INVALID_ARG_VALUE')
  })

  it('non Duplex streams should ignore the options', () => {
    const r = new Readable({ readableHighWaterMark: 666 } as any)
    expect((r as any)._readableState.highWaterMark).toBe(DEFAULT)
    const w = new Writable({ writableHighWaterMark: 777 } as any)
    expect((w as any)._writableState.highWaterMark).toBe(DEFAULT)
  })
})
