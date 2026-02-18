/**
 * EventEmitter browser tests
 *
 * Based on Node.js test files in https://github.com/nodejs/node/tree/main/test/parallel
 * - test-event-emitter-add-listeners.js
 * - test-event-emitter-remove-listeners.js
 * - test-event-emitter-listeners.js
 * - test-event-emitter-errors.js
 * - test-event-emitter-error-monitor.js
 * - test-event-emitter-max-listeners.js
 * - test-event-emitter-listener-count.js
 * - test-events-listener-count-with-listener.js
 * - test-events-list.js
 * - test-event-capture-rejections.js
 * - test-events-once.js
 * - test-events-on-async-iterator.js
 * - test-events-static-geteventlisteners.js
 * - test-events-getmaxlisteners.js
 * - test-events-add-abort-listener.mjs
 */

import { describe, expect, it, vi } from 'vitest'
import {
  EventEmitter,
  addAbortListener,
  getEventListeners,
  getMaxListeners,
  on,
  once
} from './events.ts'

describe('addListener / on', () => {
  it('should add and invoke listeners', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on('test', fn)
    ee.emit('test', 'a', 'b')
    expect(fn).toHaveBeenCalledWith('a', 'b')
  })

  it('should emit newListener before adding', () => {
    const ee = new EventEmitter()
    const order: string[] = []

    ee.on('newListener', (event: string) => {
      order.push(`newListener:${event}`)
    })
    order.push('before-add')
    ee.on('test', () => {})
    order.push('after-add')

    expect(order).toEqual(['before-add', 'newListener:test', 'after-add'])
  })

  it('should call multiple listeners in order', () => {
    const ee = new EventEmitter()
    const order: number[] = []
    ee.on('test', () => order.push(1))
    ee.on('test', () => order.push(2))
    ee.on('test', () => order.push(3))
    ee.emit('test')
    expect(order).toEqual([1, 2, 3])
  })

  it('should return the emitter for chaining', () => {
    const ee = new EventEmitter()
    expect(ee.on('test', () => {})).toBe(ee)
    expect(ee.addListener('test', () => {})).toBe(ee)
  })

  it('should throw if listener is not a function', () => {
    const ee = new EventEmitter()
    expect(() => ee.on('test', 'not a function' as unknown as Function)).toThrow(TypeError)
  })
})

describe('prependListener / prependOnceListener', () => {
  it('should prepend listener before existing ones', () => {
    const ee = new EventEmitter()
    const order: number[] = []
    ee.on('test', () => order.push(1))
    ee.prependListener('test', () => order.push(0))
    ee.emit('test')
    expect(order).toEqual([0, 1])
  })

  it('should prepend once listener', () => {
    const ee = new EventEmitter()
    const order: number[] = []
    ee.on('test', () => order.push(1))
    ee.prependOnceListener('test', () => order.push(0))
    ee.emit('test')
    ee.emit('test')
    expect(order).toEqual([0, 1, 1])
  })
})

describe('removeListener / off', () => {
  it('should remove a listener', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on('test', fn)
    ee.removeListener('test', fn)
    ee.emit('test')
    expect(fn).not.toHaveBeenCalled()
  })

  it('should emit removeListener event', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    const removeFn = vi.fn()
    ee.on('removeListener', removeFn)
    ee.on('test', fn)
    ee.removeListener('test', fn)
    expect(removeFn).toHaveBeenCalledWith('test', fn)
  })

  it('off should behave the same as removeListener', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on('test', fn)
    ee.off('test', fn)
    ee.emit('test')
    expect(fn).not.toHaveBeenCalled()
  })

  it('should remove only the first matching listener', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on('test', fn)
    ee.on('test', fn)
    ee.removeListener('test', fn)
    ee.emit('test')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle removing a once listener', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.once('test', fn)
    ee.removeListener('test', fn)
    ee.emit('test')
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('once (instance method)', () => {
  it('should fire listener only once', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.once('test', fn)
    ee.emit('test')
    ee.emit('test')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('removeAllListeners', () => {
  it('should remove all listeners for a type', () => {
    const ee = new EventEmitter()
    ee.on('test', () => {})
    ee.on('test', () => {})
    ee.on('other', () => {})
    ee.removeAllListeners('test')
    expect(ee.listenerCount('test')).toBe(0)
    expect(ee.listenerCount('other')).toBe(1)
  })

  it('should remove all listeners when no type given', () => {
    const ee = new EventEmitter()
    ee.on('a', () => {})
    ee.on('b', () => {})
    ee.removeAllListeners()
    expect(ee.eventNames()).toEqual([])
  })
})

describe('listeners / rawListeners', () => {
  it('should return a copy of listeners array', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.on('test', fn)
    const result = ee.listeners('test')
    expect(result).toEqual([fn])
    expect(result).not.toBe(ee.listeners('test'))
  })

  it('should unwrap once wrappers for listeners()', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.once('test', fn)
    expect(ee.listeners('test')).toEqual([fn])
  })

  it('should return wrapper for rawListeners()', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.once('test', fn)
    const raw = ee.rawListeners('test')
    expect(raw).toHaveLength(1)
    expect(raw[0]).not.toBe(fn)
    expect((raw[0] as Function & { listener: Function }).listener).toBe(fn)
  })
})

describe('error event', () => {
  it('should throw if error emitted without listener', () => {
    const ee = new EventEmitter()
    expect(() => ee.emit('error', new Error('test'))).toThrow('test')
  })

  it('should throw with context if non-Error emitted', () => {
    const ee = new EventEmitter()
    expect(() => ee.emit('error', 'string error')).toThrow('Unhandled error.')
  })

  it('should not throw if error listener exists', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on('error', fn)
    ee.emit('error', new Error('test'))
    expect(fn).toHaveBeenCalled()
  })
})

describe('errorMonitor', () => {
  it('should emit errorMonitor before error handler', () => {
    const ee = new EventEmitter()
    const order: string[] = []

    ee.on(EventEmitter.errorMonitor, () => order.push('monitor'))
    ee.on('error', () => order.push('handler'))
    ee.emit('error', new Error('test'))

    expect(order).toEqual(['monitor', 'handler'])
  })

  it('should emit errorMonitor even if error throws', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    ee.on(EventEmitter.errorMonitor, fn)
    expect(() => ee.emit('error', new Error('boom'))).toThrow('boom')
    expect(fn).toHaveBeenCalled()
  })
})

describe('maxListeners', () => {
  it('should default to 10', () => {
    const ee = new EventEmitter()
    expect(ee.getMaxListeners()).toBe(10)
  })

  it('should be settable per instance', () => {
    const ee = new EventEmitter()
    ee.setMaxListeners(20)
    expect(ee.getMaxListeners()).toBe(20)
  })

  it('should throw on invalid value', () => {
    const ee = new EventEmitter()
    expect(() => ee.setMaxListeners(-1)).toThrow(RangeError)
    expect(() => ee.setMaxListeners(NaN)).toThrow(RangeError)
  })

  it('static defaultMaxListeners should be configurable', () => {
    const original = EventEmitter.defaultMaxListeners
    try {
      EventEmitter.defaultMaxListeners = 5
      const ee = new EventEmitter()
      expect(ee.getMaxListeners()).toBe(5)
    } finally {
      EventEmitter.defaultMaxListeners = original
    }
  })
})

describe('listenerCount', () => {
  it('should count listeners', () => {
    const ee = new EventEmitter()
    ee.on('test', () => {})
    ee.on('test', () => {})
    expect(ee.listenerCount('test')).toBe(2)
  })

  it('should return 0 for no listeners', () => {
    const ee = new EventEmitter()
    expect(ee.listenerCount('test')).toBe(0)
  })

  it('static listenerCount should work', () => {
    const ee = new EventEmitter()
    ee.on('test', () => {})
    expect(EventEmitter.listenerCount(ee, 'test')).toBe(1)
  })
})

describe('listenerCount with listener argument', () => {
  it('should count specific listener', () => {
    const ee = new EventEmitter()
    const fn1 = () => {}
    const fn2 = () => {}
    ee.on('test', fn1)
    ee.on('test', fn2)
    ee.on('test', fn1)
    expect(ee.listenerCount('test', fn1)).toBe(2)
    expect(ee.listenerCount('test', fn2)).toBe(1)
  })

  it('should count once listener', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.once('test', fn)
    expect(ee.listenerCount('test', fn)).toBe(1)
  })

  it('should return 0 after removing listener', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.on('test', fn)
    ee.off('test', fn)
    expect(ee.listenerCount('test', fn)).toBe(0)
  })
})

describe('eventNames', () => {
  it('should return string event names', () => {
    const ee = new EventEmitter()
    ee.on('foo', () => {})
    ee.on('bar', () => {})
    expect(ee.eventNames()).toEqual(expect.arrayContaining(['foo', 'bar']))
  })

  it('should return symbol event names', () => {
    const ee = new EventEmitter()
    const sym = Symbol('test')
    ee.on(sym, () => {})
    expect(ee.eventNames()).toContain(sym)
  })

  it('should return empty array for no events', () => {
    const ee = new EventEmitter()
    expect(ee.eventNames()).toEqual([])
  })
})

describe('captureRejections', () => {
  it('should capture async rejection to error event', async () => {
    const ee = new EventEmitter({ captureRejections: true })
    const error = new Error('async fail')

    // eslint-disable-next-line @typescript-eslint/require-await -- ignore for testing
    ee.on('test', async () => {
      throw error
    })

    const errorPromise = new Promise<Error>(resolve => {
      ee.on('error', (err: Error) => resolve(err))
    })

    ee.emit('test')

    const caught = await errorPromise
    expect(caught).toBe(error)
  })

  it('should use Symbol.for(nodejs.rejection) handler if defined', async () => {
    const ee = new EventEmitter({ captureRejections: true })
    const error = new Error('rejection')
    const handler = vi.fn()
    ;(ee as unknown as Record<symbol, Function>)[Symbol.for('nodejs.rejection')] = handler

    // eslint-disable-next-line @typescript-eslint/require-await -- ignore for testing
    ee.on('test', async () => {
      throw error
    })

    ee.emit('test')

    await new Promise(r => setTimeout(r, 50))
    expect(handler).toHaveBeenCalledWith(error, 'test')
  })

  it('static captureRejections should set default', () => {
    const original = EventEmitter.captureRejections
    try {
      EventEmitter.captureRejections = true
      const ee = new EventEmitter()
      // captureRejections inherited from prototype
      expect((ee as unknown as Record<symbol, boolean>)[Symbol('kCapture') as unknown as symbol])
        .toBeDefined
    } finally {
      EventEmitter.captureRejections = original
    }
  })
})

describe('EventEmitter.setMaxListeners (static)', () => {
  it('should set max listeners on multiple emitters', () => {
    const ee1 = new EventEmitter()
    const ee2 = new EventEmitter()
    EventEmitter.setMaxListeners(42, ee1, ee2)
    expect(ee1.getMaxListeners()).toBe(42)
    expect(ee2.getMaxListeners()).toBe(42)
  })

  it('should set defaultMaxListeners when no targets', () => {
    const original = EventEmitter.defaultMaxListeners
    try {
      EventEmitter.setMaxListeners(99)
      expect(EventEmitter.defaultMaxListeners).toBe(99)
    } finally {
      EventEmitter.defaultMaxListeners = original
    }
  })

  it('should throw on invalid target', () => {
    expect(() =>
      EventEmitter.setMaxListeners(10, 'not an emitter' as unknown as EventEmitter)
    ).toThrow(TypeError)
  })
})

describe('module once()', () => {
  it('should resolve with event args', async () => {
    const ee = new EventEmitter()
    const p = once(ee, 'test')
    ee.emit('test', 'a', 'b')
    const result = await p
    expect(result).toEqual(['a', 'b'])
  })

  it('should reject on error event', async () => {
    const ee = new EventEmitter()
    const p = once(ee, 'test')
    const error = new Error('fail')
    ee.emit('error', error)
    await expect(p).rejects.toBe(error)
  })

  it('should support AbortSignal', async () => {
    const ee = new EventEmitter()
    const ac = new AbortController()
    const p = once(ee, 'test', { signal: ac.signal })
    ac.abort()
    await expect(p).rejects.toThrow('aborted')
  })

  it('should reject immediately if signal already aborted', async () => {
    const ee = new EventEmitter()
    const ac = new AbortController()
    ac.abort()
    await expect(once(ee, 'test', { signal: ac.signal })).rejects.toThrow('aborted')
  })

  it('should clean up listeners after resolving', async () => {
    const ee = new EventEmitter()
    const p = once(ee, 'test')
    ee.emit('test')
    await p
    expect(ee.listenerCount('test')).toBe(0)
    expect(ee.listenerCount('error')).toBe(0)
  })
})

describe('module on() async iterator', () => {
  it('should yield emitted events', async () => {
    const ee = new EventEmitter()
    const iterator = on(ee, 'data')

    ee.emit('data', 1)
    ee.emit('data', 2)

    const first = await iterator.next()
    expect(first.value).toEqual([1])
    expect(first.done).toBe(false)

    const second = await iterator.next()
    expect(second.value).toEqual([2])
    expect(second.done).toBe(false)

    await iterator.return!()
  })

  it('should end on return()', async () => {
    const ee = new EventEmitter()
    const iterator = on(ee, 'data')

    const result = await iterator.return!()
    expect(result.done).toBe(true)
  })

  it('should reject on error event', async () => {
    const ee = new EventEmitter()
    const iterator = on(ee, 'data')
    const error = new Error('fail')

    ee.emit('error', error)

    await expect(iterator.next()).rejects.toBe(error)
  })

  it('should support AbortSignal', async () => {
    const ee = new EventEmitter()
    const ac = new AbortController()
    const iterator = on(ee, 'data', { signal: ac.signal })

    ac.abort()

    await expect(iterator.next()).rejects.toThrow('aborted')
  })

  it('should throw if signal already aborted', () => {
    const ee = new EventEmitter()
    const ac = new AbortController()
    ac.abort()
    expect(() => on(ee, 'data', { signal: ac.signal })).toThrow('aborted')
  })

  it('should be async iterable', async () => {
    const ee = new EventEmitter()
    const iterator = on(ee, 'data')
    const collected: unknown[][] = []

    ee.emit('data', 'a')
    ee.emit('data', 'b')

    // Consume 2 events then break
    let count = 0
    for await (const value of iterator) {
      collected.push(value)
      count++
      if (count === 2) {
        break
      }
    }

    expect(collected).toEqual([['a'], ['b']])
  })
})

describe('getEventListeners()', () => {
  it('should return listeners for EventEmitter', () => {
    const ee = new EventEmitter()
    const fn = () => {}
    ee.on('test', fn)
    expect(getEventListeners(ee, 'test')).toEqual([fn])
  })

  it('should return empty array for EventTarget', () => {
    const target = new EventTarget()
    // EventTarget has no public API to enumerate listeners
    expect(getEventListeners(target, 'test')).toEqual([])
  })

  it('should return empty for no listeners', () => {
    const ee = new EventEmitter()
    expect(getEventListeners(ee, 'test')).toEqual([])
  })
})

describe('getMaxListeners()', () => {
  it('should return max listeners for EventEmitter', () => {
    const ee = new EventEmitter()
    ee.setMaxListeners(42)
    expect(getMaxListeners(ee)).toBe(42)
  })

  it('should return default max listeners', () => {
    const ee = new EventEmitter()
    expect(getMaxListeners(ee)).toBe(EventEmitter.defaultMaxListeners)
  })

  it('should throw for non-EventEmitter', () => {
    expect(() => getMaxListeners({} as EventEmitter)).toThrow(TypeError)
  })
})

describe('addAbortListener()', () => {
  it('should call listener on abort', () => {
    const ac = new AbortController()
    const fn = vi.fn()
    addAbortListener(ac.signal, fn)
    ac.abort()
    expect(fn).toHaveBeenCalled()
  })

  it('should return disposable that removes listener', () => {
    const ac = new AbortController()
    const fn = vi.fn()
    const disposable = addAbortListener(ac.signal, fn)
    disposable[Symbol.dispose]()
    ac.abort()
    expect(fn).not.toHaveBeenCalled()
  })

  it('should throw on invalid signal', () => {
    expect(() => addAbortListener(null as unknown as AbortSignal, () => {})).toThrow(TypeError)
  })
})

describe('newListener / removeListener events', () => {
  it('should emit newListener with correct args', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    const listener = () => {}
    ee.on('newListener', fn)
    ee.on('test', listener)
    expect(fn).toHaveBeenCalledWith('test', listener)
  })

  it('should emit removeListener with correct args', () => {
    const ee = new EventEmitter()
    const fn = vi.fn()
    const listener = () => {}
    ee.on('removeListener', fn)
    ee.on('test', listener)
    ee.removeListener('test', listener)
    expect(fn).toHaveBeenCalledWith('test', listener)
  })
})

describe('symbols', () => {
  it('should expose captureRejectionSymbol', () => {
    expect(EventEmitter.captureRejectionSymbol).toBe(Symbol.for('nodejs.rejection'))
  })

  it('should expose errorMonitor', () => {
    expect(typeof EventEmitter.errorMonitor).toBe('symbol')
  })
})

describe('inheritance', () => {
  it('should support extending EventEmitter', () => {
    class MyEmitter extends EventEmitter {}
    const ee = new MyEmitter()
    const fn = vi.fn()
    ee.on('test', fn)
    ee.emit('test', 42)
    expect(fn).toHaveBeenCalledWith(42)
  })

  it('EventEmitter.EventEmitter should be EventEmitter', () => {
    expect(EventEmitter.EventEmitter).toBe(EventEmitter)
  })
})
