import { describe, it, expect } from 'vite-plus/test'
import { mustCall, assertThrowsCode } from '../common/index.ts'
import { Writable } from 'readable-stream'

function expectErrorSync(w: Writable, args: unknown[], code: string) {
  assertThrowsCode(() => (w.write as Function)(...args), code)
}

function expectErrorAsync(w: Writable, args: unknown[], code: string): Promise<void> {
  return new Promise<void>(resolve => {
    let errorCalled = false
    let ticked = false
    ;(w.write as Function)(
      ...args,
      mustCall((err: Error & { code?: string }) => {
        expect(ticked).toBe(true)
        expect(errorCalled).toBe(false)
        expect(err.code).toBe(code)
      }) as (err: Error) => void
    )
    ticked = true
    w.on(
      'error',
      mustCall((err: Error & { code?: string }) => {
        errorCalled = true
        expect(err.code).toBe(code)
        resolve()
      }) as (...args: unknown[]) => void
    )
  })
}

function test(autoDestroy: boolean) {
  describe(`autoDestroy=${autoDestroy}`, () => {
    it('write after end emits ERR_STREAM_WRITE_AFTER_END', () => {
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy,
        _write() {}
      })
      w.end()
      return expectErrorAsync(w, ['asd'], 'ERR_STREAM_WRITE_AFTER_END')
    })

    it('destroy does not throw', () => {
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy,
        _write() {}
      })
      w.destroy()
    })

    it('write null throws ERR_STREAM_NULL_VALUES', () => {
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy,
        _write() {}
      })
      expectErrorSync(w, [null], 'ERR_STREAM_NULL_VALUES')
    })

    it('write object throws ERR_INVALID_ARG_TYPE', () => {
      const w = new Writable({
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy,
        _write() {}
      })
      expectErrorSync(w, [{}], 'ERR_INVALID_ARG_TYPE')
    })

    it('write with invalid encoding throws ERR_UNKNOWN_ENCODING', () => {
      const w = new Writable({
        decodeStrings: false,
        // @ts-ignore - autoDestroy exists at runtime
        autoDestroy,
        _write() {}
      })
      expectErrorSync(w, ['asd', 'noencoding'], 'ERR_UNKNOWN_ENCODING')
    })
  })
}

describe('test-stream-writable-write-error', () => {
  test(false)
  test(true)
})
