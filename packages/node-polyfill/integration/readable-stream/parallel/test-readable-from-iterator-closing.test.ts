import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-readable-from-iterator-closing', () => {
  it('async generator: break closes iterator', async () => {
    const finallyMustCall = mustCall() as () => void
    const bodyMustCall = mustCall() as () => void
    async function* infiniteGenerate() {
      try {
        while (true) {
          yield 'a'
        }
      } finally {
        finallyMustCall()
      }
    }
    const stream = Readable.from(infiniteGenerate())
    for await (const chunk of stream) {
      bodyMustCall()
      expect(chunk).toBe('a')
      break
    }
  })

  it('sync generator: break closes iterator', async () => {
    const finallyMustCall = mustCall() as () => void
    const bodyMustCall = mustCall() as () => void
    function* infiniteGenerate() {
      try {
        while (true) {
          yield 'a'
        }
      } finally {
        finallyMustCall()
      }
    }
    const stream = Readable.from(infiniteGenerate())
    for await (const chunk of stream) {
      bodyMustCall()
      expect(chunk).toBe('a')
      break
    }
  })

  it('sync promise generator: return is awaited', async () => {
    const returnMustBeAwaited = mustCall() as () => void
    const bodyMustCall = mustCall() as () => void
    function* infiniteGenerate(): Generator<Promise<string>, any, unknown> {
      try {
        while (true) {
          yield Promise.resolve('a')
        }
      } finally {
        return {
          then(cb: () => void) {
            returnMustBeAwaited()
            cb()
          }
        }
      }
    }
    const stream = Readable.from(infiniteGenerate())
    for await (const chunk of stream) {
      bodyMustCall()
      expect(chunk).toBe('a')
      break
    }
  })

  it('sync rejected promise: catch called', async () => {
    const returnMustBeAwaited = mustCall() as () => void
    const bodyMustNotCall = mustNotCall() as (...args: unknown[]) => void
    const catchMustCall = mustCall() as () => void
    const secondNextMustNotCall = mustNotCall() as () => void
    function* generate(): Generator<Promise<string>, any, unknown> {
      try {
        yield Promise.reject('a')
        secondNextMustNotCall()
      } finally {
        return {
          then(cb: () => void) {
            returnMustBeAwaited()
            cb()
          }
        }
      }
    }
    const stream = Readable.from(generate())
    try {
      for await (const chunk of stream) {
        bodyMustNotCall(chunk)
      }
    } catch {
      catchMustCall()
    }
  })

  it('no return after throw', async () => {
    const returnMustNotCall = mustNotCall() as () => void
    const bodyMustNotCall = mustNotCall() as (...args: unknown[]) => void
    const catchMustCall = mustCall() as () => void
    const nextMustCall = mustCall() as () => void
    const stream = Readable.from({
      [Symbol.asyncIterator]() {
        return this
      },
      async next() {
        nextMustCall()
        throw new Error('a')
      },
      async return() {
        returnMustNotCall()
        return { done: true }
      }
    } as any)
    try {
      for await (const chunk of stream) {
        bodyMustNotCall(chunk)
      }
    } catch {
      catchMustCall()
    }
  })

  it('close stream while next is pending', () =>
    new Promise<void>(resolve => {
      const finallyMustCall = mustCall() as () => void
      const dataMustCall = mustCall() as () => void
      let resolveDestroy: Function
      const destroyed = new Promise<void>(res => {
        resolveDestroy = mustCall(res) as Function
      })
      let resolveYielded: Function
      const yielded = new Promise<void>(res => {
        resolveYielded = mustCall(res) as Function
      })
      async function* infiniteGenerate() {
        try {
          while (true) {
            yield 'a'
            resolveYielded()
            await destroyed
          }
        } finally {
          finallyMustCall()
        }
      }
      const stream = Readable.from(infiniteGenerate())
      stream.on('data', data => {
        dataMustCall()
        expect(data).toBe('a')
      })
      stream.on('close', () => {
        resolve()
      })
      yielded.then(() => {
        stream.destroy()
        resolveDestroy()
      })
    }))

  it('close after null yielded', () =>
    new Promise<void>(resolve => {
      const finallyMustCall = mustCall() as () => void
      const dataMustCall = mustCall(undefined, 3) as () => void
      function* generate() {
        try {
          yield 'a'
          yield 'a'
          yield 'a'
        } finally {
          finallyMustCall()
        }
      }
      const stream = Readable.from(generate())
      stream.on('data', chunk => {
        dataMustCall()
        expect(chunk).toBe('a')
      })
      stream.on(
        'end',
        mustCall(() => {
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))
})
