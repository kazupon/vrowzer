import { Duplex } from 'readable-stream'
import { describe, expect, it } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'

describe('test-stream-duplex-readable-writable', () => {
  it('should error when pushing to non-readable duplex', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        readable: false
      })
      expect(duplex.readable).toBe(false)
      duplex.push('asd')
      duplex.on(
        'error',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_PUSH_AFTER_EOF')
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.on('data', mustNotCall() as (...args: unknown[]) => void)
      duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('should error when writing to non-writable duplex', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        writable: false,
        write: mustNotCall() as (...args: unknown[]) => void as unknown as (
          chunk: unknown,
          encoding: string,
          callback: (error?: Error | null) => void
        ) => void
      })
      expect(duplex.writable).toBe(false)
      duplex.write('asd')
      duplex.on(
        'error',
        mustCall((err: Error & { code?: string }) => {
          expect(err.code).toBe('ERR_STREAM_WRITE_AFTER_END')
          resolve()
        }) as (...args: unknown[]) => void
      )
      duplex.on('finish', mustNotCall() as (...args: unknown[]) => void)
    }))

  it('should iterate empty async iterator for non-readable duplex', () =>
    new Promise<void>(resolve => {
      const duplex = new Duplex({
        readable: false
      })
      expect(duplex.readable).toBe(false)
      duplex.on('data', mustNotCall() as (...args: unknown[]) => void)
      duplex.on('end', mustNotCall() as (...args: unknown[]) => void)
      async function run() {
        for await (const chunk of duplex) {
          expect(false).toBeTruthy() // should not reach here: ${chunk}
          void chunk
        }
      }
      run().then(
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
