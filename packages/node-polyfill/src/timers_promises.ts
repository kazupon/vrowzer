/**
 * `node:timers/promises` compatible entry point
 *
 * Promise-based timer functions with AbortSignal support.
 *
 * @module timers/promises
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { setImmediate as _setImmediate } from './timers.ts'

interface TimerOptions {
  signal?: AbortSignal
  ref?: boolean
}

export function setTimeout<T = void>(
  delay?: number,
  value?: T,
  options?: TimerOptions
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new DOMException('The operation was aborted', 'AbortError'))
      return
    }
    const id = globalThis.setTimeout(() => resolve(value as T), delay ?? 0)
    if (options?.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          globalThis.clearTimeout(id)
          reject(new DOMException('The operation was aborted', 'AbortError'))
        },
        { once: true }
      )
    }
  })
}

export function setImmediate<T = void>(value?: T, options?: TimerOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new DOMException('The operation was aborted', 'AbortError'))
      return
    }
    _setImmediate(() => resolve(value as T))
    if (options?.signal) {
      options.signal.addEventListener(
        'abort',
        () => reject(new DOMException('The operation was aborted', 'AbortError')),
        { once: true }
      )
    }
  })
}

export function setInterval<T = void>(
  delay?: number,
  value?: T,
  options?: TimerOptions
): AsyncIterableIterator<T> {
  let id: ReturnType<typeof globalThis.setInterval> | null = null
  let done = false
  const pending: Array<{ resolve: (v: IteratorResult<T>) => void }> = []
  const queue: T[] = []

  const cleanup = () => {
    done = true
    if (id != null) {
      globalThis.clearInterval(id)
      id = null
    }
    while (pending.length > 0) {
      pending.shift()!.resolve({ value: undefined as T, done: true })
    }
  }

  if (options?.signal?.aborted) {
    done = true
  } else {
    id = globalThis.setInterval(() => {
      if (pending.length > 0) {
        pending.shift()!.resolve({ value: value as T, done: false })
      } else {
        queue.push(value as T)
      }
    }, delay ?? 0)

    options?.signal?.addEventListener('abort', cleanup, { once: true })
  }

  return {
    next(): Promise<IteratorResult<T>> {
      if (queue.length > 0) {
        return Promise.resolve({ value: queue.shift()!, done: false })
      }
      if (done) {
        return Promise.resolve({ value: undefined as T, done: true })
      }
      return new Promise(resolve => {
        pending.push({ resolve })
      })
    },
    return(): Promise<IteratorResult<T>> {
      cleanup()
      return Promise.resolve({ value: undefined as T, done: true })
    },
    [Symbol.asyncIterator]() {
      return this
    }
  }
}

export const scheduler = {
  wait(delay?: number, options?: TimerOptions): Promise<void> {
    return setTimeout(delay, undefined, options)
  },
  yield(): Promise<void> {
    return new Promise<void>(resolve => queueMicrotask(resolve))
  }
}
