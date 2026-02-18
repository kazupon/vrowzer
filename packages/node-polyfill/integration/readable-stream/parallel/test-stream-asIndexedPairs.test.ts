import { describe, it, expect } from 'vitest'
import { assertThrowsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-asIndexedPairs', () => {
  it('asIndexedPairs with a synchronous stream', async () => {
    const pairs = await Readable.from([1, 2, 3]).asIndexedPairs().toArray()
    expect(pairs).toEqual([
      [0, 1],
      [1, 2],
      [2, 3]
    ])
    const empty = await Readable.from([]).asIndexedPairs().toArray()
    expect(empty).toEqual([])
  })

  it('asIndexedPairs works on asynchronous streams', async () => {
    const asyncFrom = (...args: unknown[]) =>
      Readable.from(...(args as [Iterable<unknown>])).map(async (x: unknown) => x)
    const pairs = await asyncFrom([1, 2, 3]).asIndexedPairs().toArray()
    expect(pairs).toEqual([
      [0, 1],
      [1, 2],
      [2, 3]
    ])
    const empty = await asyncFrom([]).asIndexedPairs().toArray()
    expect(empty).toEqual([])
  })

  it('does not enumerate an infinite stream', async () => {
    const infinite = () =>
      Readable.from(
        (async function* () {
          while (true) {
            yield 1
          }
        })()
      )
    const pairs = await infinite().asIndexedPairs().take(3).toArray()
    expect(pairs).toEqual([
      [0, 1],
      [1, 1],
      [2, 1]
    ])
    const empty = await infinite().asIndexedPairs().take(0).toArray()
    expect(empty).toEqual([])
  })

  it('AbortSignal', async () => {
    await expect(
      (async () => {
        const ac = new AbortController()
        const { signal } = ac
        const p = Readable.from([1, 2, 3]).asIndexedPairs({ signal }).toArray()
        ac.abort()
        await p
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })

    await expect(
      (async () => {
        const signal = AbortSignal.abort()
        await Readable.from([1, 2, 3]).asIndexedPairs({ signal }).toArray()
      })()
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('error cases', () => {
    assertThrowsCode(
      () => Readable.from([1]).asIndexedPairs(1 as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
    assertThrowsCode(
      () => Readable.from([1]).asIndexedPairs({ signal: true } as unknown as object),
      'ERR_INVALID_ARG_TYPE'
    )
  })
})
