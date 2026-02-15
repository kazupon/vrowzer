import { describe, it } from 'vitest'
import { assertThrowsCode } from '../common/index.ts'
// @ts-ignore - addAbortSignal exists at runtime but not in types
import { addAbortSignal, Readable } from 'readable-stream'

describe('test-stream-add-abort-signal', () => {
  it('throws ERR_INVALID_ARG_TYPE on invalid signal', () => {
    assertThrowsCode(() => {
      addAbortSignal('INVALID_SIGNAL' as any, new Readable())
    }, 'ERR_INVALID_ARG_TYPE')
  })

  it('throws ERR_INVALID_ARG_TYPE on invalid stream', () => {
    const ac = new AbortController()
    assertThrowsCode(() => {
      addAbortSignal(ac.signal, 'INVALID_STREAM' as any)
    }, 'ERR_INVALID_ARG_TYPE')
  })
})
