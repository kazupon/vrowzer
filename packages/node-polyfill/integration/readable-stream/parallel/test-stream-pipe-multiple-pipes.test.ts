import { describe, it, expect } from 'vite-plus/test'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-multiple-pipes', () => {
  it('should pipe to multiple writable streams and unpipe correctly', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read: () => {}
      })
      const writables: Array<Writable & { output: Buffer[] }> = []
      for (let i = 0; i < 5; i++) {
        const target = new Writable({
          write: mustCall((chunk: Buffer, _encoding: string, callback: () => void) => {
            ;(target as any).output.push(chunk)
            callback()
          }, 1) as (...args: unknown[]) => void
        }) as Writable & { output: Buffer[] }
        ;(target as any).output = []
        target.on('pipe', mustCall() as (...args: unknown[]) => void)
        readable.pipe(target)
        writables.push(target)
      }
      const input = Buffer.from([1, 2, 3, 4, 5])
      readable.push(input)

      // The pipe() calls will postpone emission of the 'resume' event using nextTick,
      // so no data will be available to the writable streams until then.
      process.nextTick(
        mustCall(() => {
          for (const target of writables) {
            expect(target.output).toEqual([input])
            target.on('unpipe', mustCall() as (...args: unknown[]) => void)
            readable.unpipe(target)
          }
          readable.push('something else') // This does not get through.
          readable.push(null)
          readable.resume() // Make sure the 'end' event gets emitted.
        }) as (...args: unknown[]) => void
      )
      readable.on(
        'end',
        mustCall(() => {
          for (const target of writables) {
            expect(target.output).toEqual([input])
          }
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
