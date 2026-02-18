import { describe, it } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Writable } from 'readable-stream'

// This test verifies that repeated writes with the same callback
// allocate exactly the expected number of write calls.
// The original test uses async_hooks and Console which are Node.js-specific.
// This adaptation tests the core write behavior without async_hooks.

describe('test-stream-writable-samecb-singletick', () => {
  it('repeated writes invoke write callback correct number of times', () => {
    const w = new Writable({
      write: mustCall((_chunk: unknown, _encoding: string, cb: () => void) => {
        cb()
      }, 100) as (chunk: unknown, encoding: string, cb: () => void) => void
    })
    for (let i = 0; i < 100; i++) {
      w.write(`${i}\n`)
    }
  })
})
