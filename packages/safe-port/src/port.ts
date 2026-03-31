/**
 * Safe MessagePort wrapper
 *
 * @module port
 */

/**
 * @license MIT
 * @author kazuya kawaguchi (a.k.a. kazupon)
 */

import { Emitter } from '@kazupon/jts-utils/event'

import type { Emittable } from '@kazupon/jts-utils/event/emitter'

/**
 * Message port events
 *
 * @typeParam T - Message data type
 */
export type MessagePortEvents<T = unknown> = {
  message: MessageEvent<T>
  messageerror: MessageEvent
}

/**
 * Safe MessagePort wrapper interface
 *
 * @typeParam T - Message data type
 */
export interface SafeMessagePort<T = unknown> extends Emittable<MessagePortEvents<T>>, Disposable {
  raw: MessagePort
  postMessage(message: any, transfer?: Transferable[]): void
  start(): void
  close(): void
  addEventListener: MessagePort['addEventListener']
  removeEventListener: MessagePort['removeEventListener']
  dispatchEvent: MessagePort['dispatchEvent']
  onmessage: MessagePort['onmessage']
  onmessageerror: MessagePort['onmessageerror']
}

/**
 * Return type for {@link safeMessagePort}
 *
 * @typeParam T - Message data type
 */
export type SafeMessagePortResult<T = unknown> = Readonly<
  Omit<SafeMessagePort<T>, 'onmessage' | 'onmessageerror'>
> &
  Pick<SafeMessagePort<T>, 'onmessage' | 'onmessageerror'>

/**
 * Create a safe {@link MessagePort} wrapper as an {@link Emittable | event emitter}
 *
 * The returned SafeMessagePort will automatically handle the closing of the `MessagePort` when disposed,
 * and it will also manage event listeners to prevent memory leaks.
 *
 * The underlying `MessagePort` will be started automatically.
 *
 * @typeParam T - Message data type
 * @param port - The MessagePort to wrap
 * @returns A {@link SafeMessagePort} that wraps the `MessagePort`
 *
 * @example
 * ```ts
 * const channel = new MessageChannel()
 * const port = safeMessagePort<{ greeting: string }>(channel.port1)
 *
 * port.on('message', (event) => {
 *   console.log(event.data.greeting)  // type-safe
 * })
 *
 * port.postMessage({ greeting: 'hello' })  // type-safe
 * ```
 */
export function safeMessagePort<T = unknown>(port: MessagePort): SafeMessagePortResult<T> {
  const _emitter = Emitter<MessagePortEvents<T>>()
  let _closed = false

  const onMessage = (event: Event): void => {
    _emitter.emit('message', event as MessageEvent<T>)
  }
  const onMessageError = (event: Event): void => {
    _emitter.emit('messageerror', event as MessageEvent)
  }

  port.addEventListener('message', onMessage)
  port.addEventListener('messageerror', onMessageError)
  port.start()

  const close = (): void => {
    if (_closed) {
      return
    }
    _closed = true
    port.removeEventListener('message', onMessage)
    port.removeEventListener('messageerror', onMessageError)
    _emitter[Symbol.dispose]()
    port.close()
  }

  return {
    raw: port,
    on: _emitter.on.bind(_emitter),
    off: _emitter.off.bind(_emitter),
    emit: _emitter.emit.bind(_emitter),
    once: _emitter.once.bind(_emitter),
    postMessage: (message: T, transfer?: Transferable[]) => {
      port.postMessage(message, transfer ?? [])
    },
    start: port.start.bind(port),
    close,
    addEventListener: port.addEventListener.bind(port),
    removeEventListener: port.removeEventListener.bind(port),
    dispatchEvent: port.dispatchEvent.bind(port),
    get onmessage() {
      return port.onmessage
    },
    set onmessage(handler) {
      port.onmessage = handler
    },
    get onmessageerror() {
      return port.onmessageerror
    },
    set onmessageerror(handler) {
      port.onmessageerror = handler
    },
    dispose: close,
    [Symbol.dispose]: close
  }
}
