/**
 * `node:events` compatible entry point
 *
 * Based on npm `events@3.3.0` polyfill with class, enhanced with Node.js v23+ features:
 * - captureRejections / errorMonitor
 * - listenerCount with listener argument
 * - static setMaxListeners for multiple targets
 * - module functions: once (with AbortSignal), on (async iterator),
 *   getEventListeners, getMaxListeners, addAbortListener
 *
 * @module events
 */

/**
 * Froked from:
 * - events@3.3.0 (https://github.com/browserify/events)
 * - node:events (https://github.com/nodejs/node/tree/main/lib/events.js)
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

const kCapture = Symbol('kCapture')
const kErrorMonitor = Symbol('events.errorMonitor')
const kRejection = Symbol.for('nodejs.rejection')

function checkListener(listener: unknown): asserts listener is Function {
  if (typeof listener !== 'function') {
    throw new TypeError(
      `The "listener" argument must be of type Function. Received type ${typeof listener}`
    )
  }
}

function emitWarning(warning: Error): void {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(warning)
  }
}

interface OnceState {
  fired: boolean
  wrapFn: (((...args: unknown[]) => void) & { listener?: Function }) | undefined
  target: EventEmitter
  type: string | symbol
  listener: Function
}

function onceWrapper(this: OnceState, ...args: unknown[]): unknown {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn!)
    this.fired = true
    if (args.length === 0) return this.listener.call(this.target)
    return this.listener.apply(this.target, args)
  }
}

function onceWrap(
  target: EventEmitter,
  type: string | symbol,
  listener: Function
): ((...args: unknown[]) => void) & { listener: Function } {
  const state: OnceState = {
    fired: false,
    wrapFn: undefined,
    target,
    type,
    listener
  }
  const wrapped = onceWrapper.bind(state) as ((...args: unknown[]) => void) & {
    listener: Function
  }
  wrapped.listener = listener
  state.wrapFn = wrapped
  return wrapped
}

function arrayClone<T>(arr: T[]): T[] {
  return arr.slice()
}

function spliceOne(list: unknown[], index: number): void {
  for (; index + 1 < list.length; index++) {
    list[index] = list[index + 1]
  }
  list.pop()
}

function addCatch(
  that: EventEmitter,
  promise: unknown,
  type: string | symbol,
  args: unknown[]
): void {
  if (!(that as unknown as Record<symbol, boolean>)[kCapture]) {
    return
  }

  try {
    const then = (promise as { then?: Function }).then
    if (typeof then === 'function') {
      then.call(promise, undefined, (err: unknown) => {
        queueMicrotask(() => emitUnhandledRejectionOrErr(that, err, type, args))
      })
    }
  } catch (err) {
    that.emit('error', err)
  }
}

function emitUnhandledRejectionOrErr(
  ee: EventEmitter,
  err: unknown,
  type: string | symbol,
  args: unknown[]
): void {
  const eeRecord = ee as unknown as Record<symbol, Function | boolean | undefined>
  const rejectionHandler = eeRecord[kRejection]
  if (typeof rejectionHandler === 'function') {
    rejectionHandler.call(ee, err, type, ...args)
  } else {
    // Temporarily disable capture to prevent infinite recursion
    const prev: boolean = (eeRecord[kCapture] as boolean | undefined) ?? false
    eeRecord[kCapture] = false
    try {
      ee.emit('error', err)
    } finally {
      eeRecord[kCapture] = prev
    }
  }
}

type EventMap = Record<string | symbol, Function | Function[]>

let defaultMaxListeners = 10

export class EventEmitter {
  static EventEmitter = EventEmitter

  static captureRejectionSymbol = kRejection
  static errorMonitor = kErrorMonitor

  static get defaultMaxListeners(): number {
    return defaultMaxListeners
  }

  static set defaultMaxListeners(arg: number) {
    if (typeof arg !== 'number' || arg < 0 || Number.isNaN(arg)) {
      throw new RangeError(
        `The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ${arg}.`
      )
    }
    defaultMaxListeners = arg
  }

  static get captureRejections(): boolean {
    return EventEmitter.prototype[kCapture] as unknown as boolean
  }

  static set captureRejections(value: boolean) {
    if (typeof value !== 'boolean') {
      throw new TypeError(
        `The "EventEmitter.captureRejections" property must be of type boolean. Received type ${typeof value}`
      )
    }
    ;(EventEmitter.prototype as unknown as Record<symbol, boolean>)[kCapture] = value
  }

  static listenerCount(emitter: EventEmitter, type: string | symbol): number {
    if (typeof emitter.listenerCount === 'function') {
      return emitter.listenerCount(type)
    }
    return EventEmitter.prototype.listenerCount.call(emitter, type)
  }

  static setMaxListeners(n = defaultMaxListeners, ...eventTargets: unknown[]): void {
    if (typeof n !== 'number' || n < 0 || Number.isNaN(n)) {
      throw new RangeError(
        `The value of "n" is out of range. It must be a non-negative number. Received ${n}.`
      )
    }
    if (eventTargets.length === 0) {
      defaultMaxListeners = n
    } else {
      for (const target of eventTargets) {
        if (typeof (target as EventEmitter).setMaxListeners === 'function') {
          ;(target as EventEmitter).setMaxListeners(n)
        } else if (
          target != null &&
          typeof (target as EventTarget).addEventListener === 'function'
        ) {
          // EventTarget — no direct API, ignore silently
        } else {
          throw new TypeError(
            `The "eventTargets" argument must be an instance of EventEmitter or EventTarget. Received ${typeof target}`
          )
        }
      }
    }
  }

  declare _events: EventMap | undefined
  declare _eventsCount: number
  declare _maxListeners: number | undefined

  // kCapture is managed on prototype
  declare [kCapture]: boolean

  constructor(opts?: { captureRejections?: boolean }) {
    EventEmitter.init.call(this, opts)
  }

  static init(this: EventEmitter, opts?: { captureRejections?: boolean }): void {
    if (
      this._events === undefined ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- checking if _events is the prototype's own property
      this._events === Object.getPrototypeOf(this)?._events
    ) {
      this._events = Object.create(null) as EventMap
      this._eventsCount = 0
    }

    this._maxListeners ??= undefined

    const selfRecord = this as unknown as Record<symbol, boolean>
    if (opts?.captureRejections) {
      selfRecord[kCapture] = Boolean(opts.captureRejections)
    } else {
      selfRecord[kCapture] =
        (EventEmitter.prototype as unknown as Record<symbol, boolean | undefined>)[kCapture] ??
        false
    }
  }

  setMaxListeners(n: number): this {
    if (typeof n !== 'number' || n < 0 || Number.isNaN(n)) {
      throw new RangeError(
        `The value of "n" is out of range. It must be a non-negative number. Received ${n}.`
      )
    }
    this._maxListeners = n
    return this
  }

  getMaxListeners(): number {
    return this._maxListeners === undefined ? EventEmitter.defaultMaxListeners : this._maxListeners
  }

  emit(type: string | symbol, ...args: unknown[]): boolean {
    let doError = type === 'error'

    const events = this._events
    if (events !== undefined) {
      // Emit errorMonitor before handling error
      if (doError && events[kErrorMonitor] !== undefined) {
        this.emit(kErrorMonitor, ...args)
      }
      doError = doError && events.error === undefined
    } else if (!doError) {
      return false
    }

    if (doError) {
      const er = args.length > 0 ? args[0] : undefined
      if (er instanceof Error) {
        throw er
      }
      const err = new Error('Unhandled error.' + (er ? ` (${(er as Error).message})` : ''))
      ;(err as Error & { context: unknown }).context = er
      throw err
    }

    const handler = events![type]
    if (handler === undefined) return false

    if (typeof handler === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- handler is guaranteed to be a Function by the type guard above
      const result = Reflect.apply(handler, this, args)
      if (result !== undefined && result !== null) {
        addCatch(this, result, type, args)
      }
    } else {
      const listeners = arrayClone(handler)
      for (const listener of listeners) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- handler is guaranteed to be a Function by the type guard above
        const result = Reflect.apply(listener, this, args)
        if (result !== undefined && result !== null) {
          addCatch(this, result, type, args)
        }
      }
    }

    return true
  }

  addListener(type: string | symbol, listener: Function): this {
    return this.#addListener(type, listener, false)
  }

  on(type: string | symbol, listener: Function): this {
    return this.addListener(type, listener)
  }

  prependListener(type: string | symbol, listener: Function): this {
    return this.#addListener(type, listener, true)
  }

  once(type: string | symbol, listener: Function): this {
    checkListener(listener)
    this.on(type, onceWrap(this, type, listener))
    return this
  }

  prependOnceListener(type: string | symbol, listener: Function): this {
    checkListener(listener)
    this.prependListener(type, onceWrap(this, type, listener))
    return this
  }

  removeListener(type: string | symbol, listener: Function): this {
    checkListener(listener)

    const events = this._events
    if (events === undefined) return this

    const list = events[type]
    if (list === undefined) return this

    if (list === listener || (list as Function & { listener?: Function }).listener === listener) {
      if (--this._eventsCount === 0) {
        this._events = Object.create(null) as EventMap
      } else {
        delete events[type]
        if (events.removeListener) {
          this.emit(
            'removeListener',
            type,
            (list as Function & { listener?: Function }).listener || listener
          )
        }
      }
    } else if (typeof list !== 'function') {
      const arr = list as (Function & { listener?: Function })[]
      let position = -1
      let originalListener: Function | undefined

      for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i]!
        if (item === listener || item.listener === listener) {
          originalListener = item.listener
          position = i
          break
        }
      }

      if (position < 0) return this

      if (position === 0) {
        arr.shift()
      } else {
        spliceOne(arr, position)
      }

      if (arr.length === 1) {
        events[type] = arr[0]!
      }

      if (events.removeListener !== undefined) {
        this.emit('removeListener', type, originalListener || listener)
      }
    }

    return this
  }

  off(type: string | symbol, listener: Function): this {
    return this.removeListener(type, listener)
  }

  removeAllListeners(type?: string | symbol): this {
    const events = this._events
    if (events === undefined) return this

    if (events.removeListener === undefined) {
      if (type === undefined) {
        this._events = Object.create(null) as EventMap
        this._eventsCount = 0
      } else if (events[type] !== undefined) {
        if (--this._eventsCount === 0) {
          this._events = Object.create(null) as EventMap
        } else {
          delete events[type]
        }
      }
      return this
    }

    if (type === undefined) {
      const keys = Reflect.ownKeys(events)
      for (const key of keys) {
        if (key === 'removeListener') {
          continue
        }
        this.removeAllListeners(key)
      }
      this.removeAllListeners('removeListener')
      this._events = Object.create(null) as EventMap
      this._eventsCount = 0
      return this
    }

    const listeners = events[type]

    if (typeof listeners === 'function') {
      this.removeListener(type, listeners)
    } else if (listeners !== undefined) {
      const arr = listeners
      for (let i = arr.length - 1; i >= 0; i--) {
        this.removeListener(type, arr[i]!)
      }
    }

    return this
  }

  listeners(type: string | symbol): Function[] {
    return this.#listeners(type, true)
  }

  rawListeners(type: string | symbol): Function[] {
    return this.#listeners(type, false)
  }

  listenerCount(type: string | symbol, listener?: Function): number {
    const events = this._events

    if (events !== undefined) {
      const evlistener = events[type]

      if (typeof evlistener === 'function') {
        if (listener != null) {
          return evlistener === listener ||
            (evlistener as Function & { listener?: Function }).listener === listener
            ? 1
            : 0
        }
        return 1
      } else if (evlistener !== undefined) {
        if (listener != null) {
          let matching = 0
          const arr = evlistener as (Function & { listener?: Function })[]
          for (const l of arr) {
            if (l === listener || l.listener === listener) {
              matching++
            }
          }
          return matching
        }
        return evlistener.length
      }
    }

    return 0
  }

  eventNames(): (string | symbol)[] {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events!) : []
  }

  #addListener(type: string | symbol, listener: Function, prepend: boolean): this {
    checkListener(listener)

    let events = this._events
    if (events === undefined) {
      events = this._events = Object.create(null) as EventMap
      this._eventsCount = 0
    } else {
      if (events.newListener !== undefined) {
        this.emit(
          'newListener',
          type,
          (listener as Function & { listener?: Function }).listener || listener
        )
        events = this._events!
      }
    }

    const existing = events[type]

    if (existing === undefined) {
      events[type] = listener
      ++this._eventsCount
    } else {
      if (typeof existing === 'function') {
        events[type] = prepend ? [listener, existing] : [existing, listener]
      } else if (prepend) {
        existing.unshift(listener)
      } else {
        existing.push(listener)
      }

      const m = this.getMaxListeners()
      const arr = events[type] as Function[] & { warned?: boolean }
      if (m > 0 && Array.isArray(arr) && arr.length > m && !arr.warned) {
        arr.warned = true
        const w = new Error(
          `Possible EventEmitter memory leak detected. ${arr.length} ${String(type)} listeners added. Use emitter.setMaxListeners() to increase limit`
        )
        w.name = 'MaxListenersExceededWarning'
        ;(w as Error & { emitter: EventEmitter; type: string | symbol; count: number }).emitter =
          this
        ;(w as Error & { emitter: EventEmitter; type: string | symbol; count: number }).type = type
        ;(w as Error & { emitter: EventEmitter; type: string | symbol; count: number }).count =
          arr.length
        emitWarning(w)
      }
    }

    return this
  }

  #listeners(type: string | symbol, unwrap: boolean): Function[] {
    const events = this._events
    if (events === undefined) return []

    const evlistener = events[type]
    if (evlistener === undefined) return []

    if (typeof evlistener === 'function') {
      return unwrap
        ? [(evlistener as Function & { listener?: Function }).listener || evlistener]
        : [evlistener]
    }

    const arr = evlistener as (Function & { listener?: Function })[]
    if (unwrap) {
      return arr.map(l => l.listener || l)
    }
    return arrayClone(arr)
  }
}

// Set default captureRejections on prototype
;(EventEmitter.prototype as unknown as Record<symbol, boolean>)[kCapture] = false

/**
 * EventTarget-agnostic add listener utility
 */
function eventTargetAgnosticAddListener(
  emitter: EventEmitter | EventTarget,
  name: string | symbol,
  listener: Function,
  flags?: { once?: boolean }
): void {
  if (typeof (emitter as EventEmitter).on === 'function') {
    if (flags?.once) {
      ;(emitter as EventEmitter).once(name, listener)
    } else {
      ;(emitter as EventEmitter).on(name, listener)
    }
  } else if (typeof (emitter as EventTarget).addEventListener === 'function') {
    ;(emitter as EventTarget).addEventListener(name as string, listener as EventListener, {
      once: flags?.once ?? false
    })
  } else {
    throw new TypeError(
      `The "emitter" argument must be of type EventEmitter or EventTarget. Received type ${typeof emitter}`
    )
  }
}

function eventTargetAgnosticRemoveListener(
  emitter: EventEmitter | EventTarget,
  name: string | symbol,
  listener: Function
): void {
  if (typeof (emitter as EventEmitter).removeListener === 'function') {
    ;(emitter as EventEmitter).removeListener(name, listener)
  } else if (typeof (emitter as EventTarget).removeEventListener === 'function') {
    ;(emitter as EventTarget).removeEventListener(name as string, listener as EventListener)
  }
}

/**
 * Returns a Promise that resolves when the emitter emits the given event,
 * or rejects if the emitter emits 'error'.
 * Supports AbortSignal for cancellation.
 */
export async function once(
  emitter: EventEmitter | EventTarget,
  name: string | symbol,
  options?: { signal?: AbortSignal }
): Promise<unknown[]> {
  const signal = options?.signal
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError')
  }

  return new Promise((resolve, reject) => {
    const errorListener = (err: unknown) => {
      ;(emitter as EventEmitter).removeListener(name, resolver)
      if (signal != null) {
        eventTargetAgnosticRemoveListener(signal, 'abort', abortListener)
      }
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- we want to allow rejecting with non-Error values for compatibility with Node.js callback conventions
      reject(err)
    }

    const resolver = (...args: unknown[]) => {
      if (typeof (emitter as EventEmitter).removeListener === 'function') {
        ;(emitter as EventEmitter).removeListener('error', errorListener)
      }
      if (signal != null) {
        eventTargetAgnosticRemoveListener(signal, 'abort', abortListener)
      }
      resolve(args)
    }

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true })
    if (name !== 'error' && typeof (emitter as EventEmitter).once === 'function') {
      ;(emitter as EventEmitter).once('error', errorListener)
    }

    function abortListener() {
      eventTargetAgnosticRemoveListener(emitter, name, resolver)
      eventTargetAgnosticRemoveListener(emitter, 'error', errorListener)
      reject(new DOMException('The operation was aborted', 'AbortError'))
    }

    if (signal != null) {
      eventTargetAgnosticAddListener(signal, 'abort', abortListener, { once: true })
    }
  })
}

interface IterResult<T> {
  value: T
  done: boolean
}

function createIterResult<T>(value: T, done: boolean): IterResult<T> {
  return { value, done }
}

/**
 * Returns an AsyncIterableIterator that yields events from the emitter.
 * Supports AbortSignal for cancellation.
 */
export function on(
  emitter: EventEmitter | EventTarget,
  event: string | symbol,
  options?: { signal?: AbortSignal }
): AsyncIterableIterator<unknown[]> {
  const signal = options?.signal
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted', 'AbortError')
  }

  const unconsumedEvents: unknown[][] = []
  const unconsumedPromises: { resolve: Function; reject: Function }[] = []
  let error: unknown = null
  let finished = false

  const iterator: AsyncIterableIterator<unknown[]> = {
    next(): Promise<IteratorResult<unknown[]>> {
      if (unconsumedEvents.length > 0) {
        return Promise.resolve(createIterResult(unconsumedEvents.shift()!, false))
      }

      if (error) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- we want to allow rejecting with non-Error values for compatibility with Node.js callback conventions
        const p = Promise.reject(error)
        error = null
        return p
      }

      if (finished) {
        return closeHandler()
      }

      return new Promise((resolve, reject) => {
        unconsumedPromises.push({ resolve, reject })
      })
    },

    return(): Promise<IteratorResult<unknown[]>> {
      return closeHandler()
    },

    throw(err: Error): Promise<IteratorResult<unknown[]>> {
      errorHandler(err)
      return Promise.resolve(createIterResult(undefined as unknown as unknown[], true))
    },

    [Symbol.asyncIterator]() {
      return this
    }
  }

  const listeners: [EventEmitter | EventTarget, string | symbol, Function][] = []

  function addEventListener(
    target: EventEmitter | EventTarget,
    evt: string | symbol,
    handler: Function
  ): void {
    eventTargetAgnosticAddListener(target, evt, handler)
    listeners.push([target, evt, handler])
  }

  function removeAll(): void {
    while (listeners.length > 0) {
      const [target, evt, handler] = listeners.pop()!
      eventTargetAgnosticRemoveListener(target, evt, handler)
    }
  }

  addEventListener(emitter, event, (...args: unknown[]) => {
    eventHandler(args)
  })

  if (event !== 'error' && typeof (emitter as EventEmitter).on === 'function') {
    addEventListener(emitter, 'error', errorHandler)
  }

  let abortDisposable: { [Symbol.dispose](): void } | null = null
  if (signal) {
    abortDisposable = addAbortListener(signal, () => {
      errorHandler(new DOMException('The operation was aborted', 'AbortError'))
    })
  }

  return iterator

  function eventHandler(value: unknown[]): void {
    if (unconsumedPromises.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- we know resolve is a function
      unconsumedPromises.shift()!.resolve(createIterResult(value, false))
    } else {
      unconsumedEvents.push(value)
    }
  }

  function errorHandler(err: unknown): void {
    if (unconsumedPromises.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- we know resolve is a function
      unconsumedPromises.shift()!.reject(err)
    } else {
      error = err
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we want to trigger unhandled rejection if the error is not consumed
    closeHandler()
  }

  function closeHandler(): Promise<IteratorResult<unknown[]>> {
    abortDisposable?.[Symbol.dispose]()
    removeAll()
    finished = true
    const doneResult = createIterResult(undefined as unknown as unknown[], true)
    while (unconsumedPromises.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- we know resolve is a function
      unconsumedPromises.shift()!.resolve(doneResult)
    }
    return Promise.resolve(doneResult)
  }
}

/**
 * Returns a copy of the array of listeners for the event named `type`.
 * Works with both EventEmitter and EventTarget.
 */
export function getEventListeners(
  emitterOrTarget: EventEmitter | EventTarget,
  type: string | symbol
): Function[] {
  if (typeof (emitterOrTarget as EventEmitter).listeners === 'function') {
    return (emitterOrTarget as EventEmitter).listeners(type)
  }

  // EventTarget — no public API to enumerate listeners
  return []
}

/**
 * Returns the current max listener value for the emitter.
 * Works with both EventEmitter and EventTarget.
 */
export function getMaxListeners(emitterOrTarget: EventEmitter | EventTarget): number {
  if (typeof (emitterOrTarget as EventEmitter).getMaxListeners === 'function') {
    return (emitterOrTarget as EventEmitter).getMaxListeners()
  }

  throw new TypeError(
    `The "emitter" argument must be of type EventEmitter. Received type ${typeof emitterOrTarget}`
  )
}

/**
 * Listens to the abort event on the provided signal.
 * Returns a Disposable that removes the listener when disposed.
 */
export function addAbortListener(
  signal: AbortSignal,
  listener: () => void
): { [Symbol.dispose](): void } {
  if (typeof signal?.addEventListener !== 'function') {
    throw new TypeError(
      `The "signal" argument must be an instance of AbortSignal. Received type ${typeof signal}`
    )
  }

  signal.addEventListener('abort', listener, { once: true })

  return {
    [Symbol.dispose]() {
      signal.removeEventListener('abort', listener)
    }
  }
}
