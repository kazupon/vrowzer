/**
 * EventEmitter implementation compatible with Node.js EventEmitter interface
 */

type EventListener = (...args: any[]) => void

interface OnceWrapper extends EventListener {
  listener: EventListener
}

export class EventEmitter {
  private _events: Map<string | symbol, EventListener[]> = new Map()
  private _maxListeners: number = EventEmitter.defaultMaxListeners

  static defaultMaxListeners: number = 10

  /**
   * Adds the listener function to the end of the listeners array for the event
   */
  on(event: string | symbol, listener: EventListener): this {
    return this.addListener(event, listener)
  }

  /**
   * Alias for on()
   */
  addListener(event: string | symbol, listener: EventListener): this {
    const listeners = this._events.get(event)
    if (listeners) {
      listeners.push(listener)
    } else {
      this._events.set(event, [listener])
    }

    this._checkMaxListeners(event)
    this.emit('newListener', event, listener)

    return this
  }

  /**
   * Adds a one-time listener function for the event
   */
  once(event: string | symbol, listener: EventListener): this {
    const onceWrapper: OnceWrapper = (...args: unknown[]) => {
      this.removeListener(event, onceWrapper)
      listener.apply(this, args)
    }
    onceWrapper.listener = listener

    return this.on(event, onceWrapper)
  }

  /**
   * Adds the listener function to the beginning of the listeners array
   */
  prependListener(event: string | symbol, listener: EventListener): this {
    const listeners = this._events.get(event)
    if (listeners) {
      listeners.unshift(listener)
    } else {
      this._events.set(event, [listener])
    }

    this._checkMaxListeners(event)
    this.emit('newListener', event, listener)

    return this
  }

  /**
   * Adds a one-time listener function to the beginning of the listeners array
   */
  prependOnceListener(event: string | symbol, listener: EventListener): this {
    const onceWrapper: OnceWrapper = (...args: unknown[]) => {
      this.removeListener(event, onceWrapper)
      listener.apply(this, args)
    }
    onceWrapper.listener = listener

    return this.prependListener(event, onceWrapper)
  }

  /**
   * Removes the specified listener from the listener array for the event
   */
  off(event: string | symbol, listener: EventListener): this {
    return this.removeListener(event, listener)
  }

  /**
   * Removes the specified listener from the listener array for the event
   */
  removeListener(event: string | symbol, listener: EventListener): this {
    const listeners = this._events.get(event)
    if (!listeners) {
      return this
    }

    const index = listeners.findIndex(
      l => l === listener || (l as OnceWrapper).listener === listener
    )

    if (index !== -1) {
      listeners.splice(index, 1)
      this.emit('removeListener', event, listener)
    }

    if (listeners.length === 0) {
      this._events.delete(event)
    }

    return this
  }

  /**
   * Removes all listeners, or those of the specified event
   */
  removeAllListeners(event?: string | symbol): this {
    if (event !== undefined) {
      const listeners = this._events.get(event)
      if (listeners) {
        // Emit removeListener for each listener
        for (const listener of [...listeners]) {
          this.emit('removeListener', event, listener)
        }
        this._events.delete(event)
      }
    } else {
      // Remove all events
      for (const [eventName, listeners] of this._events.entries()) {
        if (eventName === 'removeListener') continue
        for (const listener of [...listeners]) {
          this.emit('removeListener', eventName, listener)
        }
      }
      this._events.clear()
    }

    return this
  }

  /**
   * Synchronously calls each of the listeners registered for the event
   */
  emit(event: string | symbol, ...args: unknown[]): boolean {
    const listeners = this._events.get(event)
    if (!listeners || listeners.length === 0) {
      // Special handling for 'error' event
      if (event === 'error') {
        const err = args[0]
        if (err instanceof Error) {
          throw err
        }
        const error = new Error(`Unhandled error. (${String(err)})`)
        ;(error as Error & { context: unknown }).context = err
        throw error
      }
      return false
    }

    // Clone the listeners array to handle modifications during emit
    const listenersCopy = [...listeners]
    for (const listener of listenersCopy) {
      listener.apply(this, args)
    }

    return true
  }

  /**
   * Returns the number of listeners listening to the event
   */
  listenerCount(event: string | symbol): number {
    const listeners = this._events.get(event)
    return listeners ? listeners.length : 0
  }

  /**
   * Returns a copy of the array of listeners for the event
   */
  listeners(event: string | symbol): EventListener[] {
    const listeners = this._events.get(event)
    if (!listeners) {
      return []
    }
    // Return unwrapped listeners (extract original listener from once wrappers)
    return listeners.map(l => (l as OnceWrapper).listener || l)
  }

  /**
   * Returns a copy of the array of listeners for the event, including any wrappers
   */
  rawListeners(event: string | symbol): EventListener[] {
    const listeners = this._events.get(event)
    return listeners ? [...listeners] : []
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners
   */
  eventNames(): (string | symbol)[] {
    return [...this._events.keys()]
  }

  /**
   * Returns the current max listener value for the EventEmitter
   */
  getMaxListeners(): number {
    return this._maxListeners
  }

  /**
   * Sets the max listeners for the EventEmitter
   */
  setMaxListeners(n: number): this {
    if (typeof n !== 'number' || n < 0 || Number.isNaN(n)) {
      throw new RangeError(
        `The value of "n" is out of range. It must be a non-negative number. Received ${n}`
      )
    }
    this._maxListeners = n
    return this
  }

  /**
   * Check if max listeners warning should be emitted
   */
  private _checkMaxListeners(event: string | symbol): void {
    const listeners = this._events.get(event)
    if (
      listeners &&
      this._maxListeners > 0 &&
      listeners.length > this._maxListeners &&
      !this._events.has('maxListenersExceeded')
    ) {
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ` +
          `${listeners.length} ${String(event)} listeners added. ` +
          `Use emitter.setMaxListeners() to increase limit`
      )
    }
  }

  /**
   * Static method to get listener count
   */
  static listenerCount(emitter: EventEmitter, event: string | symbol): number {
    return emitter.listenerCount(event)
  }

  /**
   * Static method to get event names from an emitter
   */
  static getEventListeners(emitter: EventEmitter, event: string | symbol): EventListener[] {
    return emitter.listeners(event)
  }

  /**
   * Creates a Promise that is fulfilled when the EventEmitter emits the given event
   */
  static once(emitter: EventEmitter, event: string | symbol): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const errorListener = (err: Error) => {
        emitter.removeListener(event, resolver)
        reject(err)
      }

      const resolver = (...args: unknown[]) => {
        emitter.removeListener('error', errorListener)
        resolve(args)
      }

      emitter.once(event, resolver)
      if (event !== 'error') {
        emitter.once('error', errorListener)
      }
    })
  }

  /**
   * Returns an AsyncIterator that iterates over events
   */
  static on(
    emitter: EventEmitter,
    event: string | symbol
  ): AsyncIterableIterator<unknown[]> & { return: () => Promise<IteratorResult<unknown[]>> } {
    const unconsumedEvents: unknown[][] = []
    const unconsumedPromises: Array<{
      resolve: (result: IteratorResult<unknown[]>) => void
      reject: (err: Error) => void
    }> = []
    let finished = false
    let error: Error | null = null

    const eventHandler = (...args: unknown[]) => {
      const promise = unconsumedPromises.shift()
      if (promise) {
        promise.resolve({ value: args, done: false })
      } else {
        unconsumedEvents.push(args)
      }
    }

    const errorHandler = (err: Error) => {
      error = err
      const promise = unconsumedPromises.shift()
      if (promise) {
        promise.reject(err)
      }
    }

    emitter.on(event, eventHandler)
    if (event !== 'error') {
      emitter.on('error', errorHandler)
    }

    const iterator: AsyncIterableIterator<unknown[]> & {
      return: () => Promise<IteratorResult<unknown[]>>
    } = {
      async next(): Promise<IteratorResult<unknown[]>> {
        if (finished) {
          return { value: undefined, done: true }
        }

        const eventValue = unconsumedEvents.shift()
        if (eventValue) {
          return { value: eventValue, done: false }
        }

        if (error) {
          throw error
        }

        return new Promise((resolve, reject) => {
          unconsumedPromises.push({ resolve, reject })
        })
      },

      // eslint-disable-next-line @typescript-eslint/require-await -- FIXME:
      async return(): Promise<IteratorResult<unknown[]>> {
        finished = true
        emitter.removeListener(event, eventHandler)
        emitter.removeListener('error', errorHandler)

        for (const promise of unconsumedPromises) {
          promise.resolve({ value: undefined, done: true })
        }

        return { value: undefined, done: true }
      },

      [Symbol.asyncIterator]() {
        return this
      }
    }

    return iterator
  }
}

export default EventEmitter
