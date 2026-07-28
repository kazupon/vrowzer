import { describe, it, expect } from 'vite-plus/test'
import { mustCall, assertThrowsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

const { from } = Readable
const fromAsync = (...args: unknown[]) =>
  from(...(args as [Iterable<unknown>])).map(async (x: unknown) => x)
const naturals = () =>
  from(
    (async function* () {
      let i = 1
      while (true) {
        yield i++
      }
    })()
  )

describe('test-stream-drop-take', () => {
  it('synchronous streams', async () => {
    expect(await from([1, 2, 3]).drop(2).toArray()).toEqual([3])
    expect(await from([1, 2, 3]).take(1).toArray()).toEqual([1])
    expect(await from([]).drop(2).toArray()).toEqual([])
    expect(await from([]).take(1).toArray()).toEqual([])
    expect(await from([1, 2, 3]).drop(1).take(1).toArray()).toEqual([2])
    expect(await from([1, 2]).drop(0).toArray()).toEqual([1, 2])
    expect(await from([1, 2]).take(0).toArray()).toEqual([])
  })

  it('asynchronous streams', async () => {
    expect(await fromAsync([1, 2, 3]).drop(2).toArray()).toEqual([3])
    expect(await fromAsync([1, 2, 3]).take(1).toArray()).toEqual([1])
    expect(await fromAsync([]).drop(2).toArray()).toEqual([])
    expect(await fromAsync([]).take(1).toArray()).toEqual([])
    expect(await fromAsync([1, 2, 3]).drop(1).take(1).toArray()).toEqual([2])
    expect(await fromAsync([1, 2]).drop(0).toArray()).toEqual([1, 2])
    expect(await fromAsync([1, 2]).take(0).toArray()).toEqual([])
  })

  it('infinite streams', async () => {
    expect(await naturals().take(1).toArray()).toEqual([1])
    expect(await naturals().drop(1).take(1).toArray()).toEqual([2])
    const next10 = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    expect(await naturals().drop(10).take(10).toArray()).toEqual(next10)
    expect(await naturals().take(5).take(1).toArray()).toEqual([1])
  })

  it('should not wait for next item when take amount consumed', async () => {
    let reached = false
    let resolve: () => void
    const promise = new Promise<void>(res => (resolve = res))
    const stream = from(
      (async function* () {
        yield 1
        await promise
        reached = true
        yield 2
      })()
    )
    await stream
      .take(1)
      .toArray()
      .then(
        mustCall(() => {
          expect(reached).toBe(false)
        }) as (...args: unknown[]) => void
      )
      .finally(() => resolve!())
  })

  it('coercion', async () => {
    // The spec made me do this ^^
    expect(
      await naturals()
        .take('cat' as unknown as number)
        .toArray()
    ).toEqual([])
    expect(
      await naturals()
        .take('2' as unknown as number)
        .toArray()
    ).toEqual([1, 2])
    expect(
      await naturals()
        .take(true as unknown as number)
        .toArray()
    ).toEqual([1])
  })

  it('support for AbortSignal', async () => {
    const ac = new AbortController()
    const takePromise = Readable.from([1, 2, 3])
      .take(1, {
        signal: ac.signal
      })
      .toArray()

    const dropPromise = Readable.from([1, 2, 3])
      .drop(1, {
        signal: ac.signal
      })
      .toArray()

    ac.abort()

    await expect(takePromise).rejects.toMatchObject({ name: 'AbortError' })
    await expect(dropPromise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('support for AbortSignal, already aborted', async () => {
    const signal = AbortSignal.abort()
    await expect(
      Readable.from([1, 2, 3])
        .take(1, {
          signal
        })
        .toArray()
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('error cases', () => {
    const invalidArgs = [-1, -Infinity, -40]
    for (const example of invalidArgs) {
      assertThrowsCode(() => from([]).take(example).toArray(), 'ERR_OUT_OF_RANGE')
    }
    assertThrowsCode(
      () => Readable.from([1]).drop(1, 1 as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () =>
        Readable.from([1]).drop(1, {
          signal: true
        } as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () => Readable.from([1]).take(1, 1 as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () =>
        Readable.from([1]).take(1, {
          signal: true
        } as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
  })
})
