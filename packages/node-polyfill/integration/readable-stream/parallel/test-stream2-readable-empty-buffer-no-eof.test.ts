import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream2-readable-empty-buffer-no-eof', () => {
  it('should not end when empty buffer is pushed (test1)', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      const buf = Buffer.alloc(5, 'x')
      let reads = 5
      r._read = function () {
        switch (reads--) {
          case 5:
            return setImmediate(() => {
              return r.push(buf)
            })
          case 4:
            setImmediate(() => {
              return r.push(Buffer.alloc(0))
            })
            return setImmediate(r.read.bind(r, 0))
          case 3:
            setImmediate(r.read.bind(r, 0))
            return process.nextTick(() => {
              return r.push(Buffer.alloc(0))
            })
          case 2:
            setImmediate(r.read.bind(r, 0))
            return r.push(Buffer.alloc(0))
          case 1:
            return r.push(buf)
          case 0:
            return r.push(null)
          default:
            throw new Error('unreachable')
        }
      }
      const results: string[] = []
      function flow() {
        let chunk
        while (null !== (chunk = r.read())) {
          results.push(String(chunk))
        }
      }
      r.on('readable', flow)
      r.on('end', () => {
        results.push('EOF')
        expect(results).toStrictEqual(['xxxxx', 'xxxxx', 'EOF'])
        resolve()
      })
      flow()
    }))

  it('should not end when empty buffer is pushed with base64 encoding (test2)', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        encoding: 'base64'
      })
      let reads = 5
      r._read = function () {
        if (!reads--) {
          return r.push(null)
        }
        return r.push(Buffer.from('x'))
      }
      const results: string[] = []
      function flow() {
        let chunk
        while (null !== (chunk = r.read())) {
          results.push(String(chunk))
        }
      }
      r.on('readable', flow)
      r.on('end', () => {
        results.push('EOF')
        expect(results).toStrictEqual(['eHh4', 'eHg=', 'EOF'])
        resolve()
      })
      flow()
    }))
})
