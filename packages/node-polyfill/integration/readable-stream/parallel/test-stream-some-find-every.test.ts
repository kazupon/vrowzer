import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall, assertRejectsCode } from '../common/index.ts'
import { Readable } from 'readable-stream'

function oneTo5() {
  return Readable.from([1, 2, 3, 4, 5])
}

function oneTo5Async() {
  return oneTo5().map(async (x: unknown) => {
    await Promise.resolve()
    return x
  })
}

describe('test-stream-some-find-every', () => {
  it('some, find, and every work with a synchronous stream and predicate', async () => {
    expect(await oneTo5().some((x: number) => x > 3)).toBe(true)
    expect(await oneTo5().every((x: number) => x > 3)).toBe(false)
    expect(await oneTo5().find((x: number) => x > 3)).toBe(4)
    expect(await oneTo5().some((x: number) => x > 6)).toBe(false)
    expect(await oneTo5().every((x: number) => x < 6)).toBe(true)
    expect(await oneTo5().find((x: number) => x > 6)).toBeUndefined()
    expect(await Readable.from([]).some(() => true)).toBe(false)
    expect(await Readable.from([]).every(() => true)).toBe(true)
    expect(await Readable.from([]).find(() => true)).toBeUndefined()
  })

  it('some, find, and every work with an asynchronous stream and synchronous predicate', async () => {
    expect(await oneTo5Async().some((x: number) => x > 3)).toBe(true)
    expect(await oneTo5Async().every((x: number) => x > 3)).toBe(false)
    expect(await oneTo5Async().find((x: number) => x > 3)).toBe(4)
    expect(await oneTo5Async().some((x: number) => x > 6)).toBe(false)
    expect(await oneTo5Async().every((x: number) => x < 6)).toBe(true)
    expect(await oneTo5Async().find((x: number) => x > 6)).toBeUndefined()
  })

  it('some, find, and every work on synchronous streams with an asynchronous predicate', async () => {
    expect(await oneTo5().some(async (x: number) => x > 3)).toBe(true)
    expect(await oneTo5().every(async (x: number) => x > 3)).toBe(false)
    expect(await oneTo5().find(async (x: number) => x > 3)).toBe(4)
    expect(await oneTo5().some(async (x: number) => x > 6)).toBe(false)
    expect(await oneTo5().every(async (x: number) => x < 6)).toBe(true)
    expect(await oneTo5().find(async (x: number) => x > 6)).toBeUndefined()
  })

  it('some, find, and every work on asynchronous streams with an asynchronous predicate', async () => {
    expect(await oneTo5Async().some(async (x: number) => x > 3)).toBe(true)
    expect(await oneTo5Async().every(async (x: number) => x > 3)).toBe(false)
    expect(await oneTo5Async().find(async (x: number) => x > 3)).toBe(4)
    expect(await oneTo5Async().some(async (x: number) => x > 6)).toBe(false)
    expect(await oneTo5Async().every(async (x: number) => x < 6)).toBe(true)
    expect(await oneTo5Async().find(async (x: number) => x > 6)).toBeUndefined()
  })

  it('some, find, and every short circuit (sync)', async () => {
    async function checkDestroyed(stream: Readable) {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      expect(stream.destroyed).toBe(true)
    }

    const someStream = oneTo5()
    await someStream.some(mustCall((x: number) => x > 2, 3) as any)
    await checkDestroyed(someStream)

    const everyStream = oneTo5()
    await everyStream.every(mustCall((x: number) => x < 3, 3) as any)
    await checkDestroyed(everyStream)

    const findStream = oneTo5()
    // @ts-ignore - find overload mismatch
    await findStream.find(mustCall((x: number) => x > 1, 2) as any)
    await checkDestroyed(findStream)

    // When short circuit isn't possible the whole stream is iterated
    await oneTo5().some(mustCall(() => false, 5) as any)
    await oneTo5().every(mustCall(() => true, 5) as any)
    // @ts-ignore - find overload mismatch
    await oneTo5().find(mustCall(() => false, 5) as any)
  })

  it('some, find, and every short circuit (async stream/predicate)', async () => {
    async function checkDestroyed(stream: Readable) {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      expect(stream.destroyed).toBe(true)
    }

    const someStream = oneTo5Async()
    await someStream.some(mustCall(async (x: number) => x > 2, 3) as any)
    await checkDestroyed(someStream)

    const everyStream = oneTo5Async()
    await everyStream.every(mustCall(async (x: number) => x < 3, 3) as any)
    await checkDestroyed(everyStream)

    const findStream = oneTo5Async()
    // @ts-ignore - find overload mismatch
    await findStream.find(mustCall(async (x: number) => x > 1, 2) as any)
    await checkDestroyed(findStream)

    // When short circuit isn't possible the whole stream is iterated
    await oneTo5Async().some(mustCall(async () => false, 5) as any)
    await oneTo5Async().every(mustCall(async () => true, 5) as any)
    // @ts-ignore - find overload mismatch
    await oneTo5Async().find(mustCall(async () => false, 5) as any)
  })

  it('concurrency does not affect which value is found', async () => {
    const found = await Readable.from([1, 2]).find(
      async (val: number) => {
        if (val === 1) {
          await new Promise<void>(resolve => setTimeout(resolve, 100))
        }
        return true
      },
      { concurrency: 2 }
    )
    expect(found).toBe(1)
  })

  it('support for AbortSignal', async () => {
    for (const op of ['some', 'every', 'find'] as const) {
      {
        const ac = new AbortController()
        const promise = (
          Readable.from([1, 2, 3]) as unknown as Record<
            string,
            (...args: unknown[]) => Promise<unknown>
          >
        )[op]!(() => new Promise(() => {}), { signal: ac.signal })
        ac.abort()
        await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
      }
      {
        // Support for pre-aborted AbortSignal
        await expect(
          (
            Readable.from([1, 2, 3]) as unknown as Record<
              string,
              (...args: unknown[]) => Promise<unknown>
            >
          )[op]!(() => new Promise(() => {}), { signal: AbortSignal.abort() })
        ).rejects.toMatchObject({ name: 'AbortError' })
      }
    }
  })

  it('error cases', async () => {
    for (const op of ['some', 'every', 'find'] as const) {
      await assertRejectsCode(async () => {
        await (
          Readable.from([1]) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>
        )[op]!(1)
      }, 'ERR_INVALID_ARG_TYPE')

      await assertRejectsCode(async () => {
        await (
          Readable.from([1]) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>
        )[op]!((x: unknown) => x, {
          concurrency: 'Foo'
        })
      }, 'ERR_OUT_OF_RANGE')

      await assertRejectsCode(async () => {
        await (
          Readable.from([1]) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>
        )[op]!((x: unknown) => x, 1)
      }, 'ERR_INVALID_ARG_TYPE')

      await assertRejectsCode(async () => {
        await (
          Readable.from([1]) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>
        )[op]!((x: unknown) => x, {
          signal: true
        })
      }, 'ERR_INVALID_ARG_TYPE')
    }
  })

  it('some/every/find do not call map internally', () => {
    for (const op of ['some', 'every', 'find'] as const) {
      const stream = oneTo5()
      Object.defineProperty(stream, 'map', {
        value: mustNotCall() as (...args: unknown[]) => unknown
      })
      // Check that map isn't getting called.
      ;(stream as unknown as Record<string, (...args: unknown[]) => unknown>)[op]!(() => {})
    }
  })
})
