import { describe, it, expect } from 'vite-plus/test'
import { mustNotCall, assertThrowsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

function oneTo5() {
  return Readable.from([1, 2, 3, 4, 5])
}

describe('test-stream-flatMap', () => {
  it('flatMap works on synchronous streams with a synchronous mapper', async () => {
    expect(
      await oneTo5()
        .flatMap((x: number) => [x + x])
        .toArray()
    ).toEqual([2, 4, 6, 8, 10])
    expect(
      await oneTo5()
        .flatMap(() => [])
        .toArray()
    ).toEqual([])
    expect(
      await oneTo5()
        .flatMap((x: number) => [x, x])
        .toArray()
    ).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })

  it('flatMap works on sync/async streams with an asynchronous mapper', async () => {
    expect(
      await oneTo5()
        .flatMap(async (x: number) => [x, x])
        .toArray()
    ).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
    const asyncOneTo5 = oneTo5().map(async (x: unknown) => x)
    expect(await asyncOneTo5.flatMap(async (x: number) => [x, x]).toArray()).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5
    ])
  })

  it('flatMap works on a stream where mapping returns a stream', async () => {
    const result = await oneTo5()
      .flatMap(async (x: number) => {
        return Readable.from([x, x])
      })
      .toArray()
    expect(result).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })

  it('concurrency + AbortSignal', async () => {
    const ac = new AbortController()
    const stream = (oneTo5() as any).flatMap(mustNotCall() as any, {
      signal: ac.signal,
      concurrency: 2
    })
    // pump
    const rejectPromise = expect(
      (async () => {
        for await (const _item of stream) {
          // nope
        }
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
    queueMicrotask(() => {
      ac.abort()
    })
    await rejectPromise
  })

  it('already aborted AbortSignal', async () => {
    const stream = (oneTo5() as any).flatMap(mustNotCall() as any, {
      signal: AbortSignal.abort()
    })
    await expect(
      (async () => {
        for await (const _item of stream) {
          // nope
        }
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('error cases', () => {
    assertThrowsCode(
      () => Readable.from([1]).flatMap(1 as unknown as () => unknown),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () =>
        Readable.from([1]).flatMap((x: unknown) => x, {
          concurrency: 'Foo'
        } as unknown as object),
      'ERR_OUT_OF_RANGE'
    )
    assertThrowsCode(
      () => Readable.from([1]).flatMap((x: unknown) => x, 1 as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () =>
        Readable.from([1]).flatMap((x: unknown) => x, {
          signal: true
        } as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
  })

  it('test result is a Readable', () => {
    const stream = oneTo5().flatMap((x: unknown) => x)
    expect(stream.readable).toBe(true)
  })

  it('flatMap does not call map internally', () => {
    const stream = oneTo5()
    Object.defineProperty(stream, 'map', {
      value: mustNotCall() as (...args: unknown[]) => unknown
    })
    // Check that map isn't getting called.
    stream.flatMap(() => true)
  })
})
