import { describe, it, expect } from 'vitest'
import { Duplex, finished } from 'readable-stream'

describe('test-stream-end-of-streams', () => {
  it('passing empty object to finished should throw ERR_INVALID_ARG_TYPE', () => {
    expect(() => {
      finished({} as any, () => {})
    }).toThrow()
  })

  it('passing a valid stream to finished should not throw', () => {
    const streamObj = new Duplex()
    streamObj.end()
    finished(streamObj, () => {})
  })
})
