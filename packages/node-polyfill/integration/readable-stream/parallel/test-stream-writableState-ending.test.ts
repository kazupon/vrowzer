import { describe, it, expect } from 'vite-plus/test'
import { Writable } from 'readable-stream'

describe('test-stream-writableState-ending', () => {
  it('ending, finished, ended states transition correctly', () => {
    const writable = new Writable()

    function testStates(ending: boolean, finished: boolean, ended: boolean) {
      expect((writable as any)._writableState.ending).toBe(ending)
      expect((writable as any)._writableState.finished).toBe(finished)
      expect((writable as any)._writableState.ended).toBe(ended)
    }

    writable._write = (_chunk, _encoding, cb) => {
      // Ending, finished, ended start in false.
      testStates(false, false, false)
      cb()
    }
    writable.on('finish', () => {
      // Ending, finished, ended = true.
      testStates(true, true, true)
    })
    const result = writable.end('testing function end()', () => {
      // Ending, finished, ended = true.
      testStates(true, true, true)
    })

    // End returns the writable instance
    expect(result).toBe(writable)

    // Ending, ended = true.
    // finished = false.
    testStates(true, false, true)
  })
})
