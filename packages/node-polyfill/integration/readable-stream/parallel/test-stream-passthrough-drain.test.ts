import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { PassThrough } from 'readable-stream'

describe('test-stream-passthrough-drain', () => {
  it('should emit drain event with highWaterMark 0', () => {
    const pt = new PassThrough({
      highWaterMark: 0
    })
    pt.on('drain', mustCall() as (...args: unknown[]) => void)
    expect(pt.write('hello1')).toBe(false)
    pt.read()
    pt.read()
  })
})
