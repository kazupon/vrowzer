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
 * Internal message protocol used for close handshake and heartbeat.
 */
const INTERNAL_MARKER = '__V_SAFE_PORT__'

type InternalMessageType = 'goodbye' | 'ping' | 'pong'
type InternalMessage = {
  [key: string]: unknown
  __V_SAFE_PORT__: true
  type: InternalMessageType
}

function isInternalMessage(data: unknown): data is InternalMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    INTERNAL_MARKER in data &&
    (data as Record<string, unknown>)[INTERNAL_MARKER] === true
  )
}

/**
 * Message port events
 *
 * @typeParam T - Message data type
 */
export type MessagePortEvents<T = unknown> = {
  message: MessageEvent<T>
  messageerror: MessageEvent
  close: undefined
  [key: string]: unknown
}

/**
 * Options for {@link safeMessagePort}
 */
export interface SafeMessagePortOptions {
  /**
   * Heartbeat configuration for detecting unresponsive remote port.
   * When enabled, periodically sends ping messages and expects pong responses.
   * If no pong is received within the timeout, fires a `close` event.
   */
  heartbeat?: {
    /**
     * Interval in milliseconds between ping messages
     * @default 1000
     */
    interval?: number
    /**
     * Timeout in milliseconds to wait for a pong response
     * @default 3000
     */
    timeout?: number
  }
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
 * When `close()` is called, a `goodbye` message is sent to the remote side so that it can
 * also fire a `close` event and clean up resources.
 *
 * @typeParam T - Message data type
 * @param port - The MessagePort to wrap
 * @param options - Optional configuration (heartbeat, etc.)
 * @returns A {@link SafeMessagePort} that wraps the `MessagePort`
 *
 * @example
 * ```ts
 * const channel = new MessageChannel()
 * const port = safeMessagePort<{ greeting: string }>(channel.port1)
 *
 * port.on('close', () => {
 *   console.log('port closed')
 * })
 *
 * port.on('message', (event) => {
 *   console.log(event.data.greeting)  // type-safe
 * })
 *
 * port.postMessage({ greeting: 'hello' })  // type-safe
 * ```
 */
export function safeMessagePort<T = unknown>(
  port: MessagePort,
  options?: SafeMessagePortOptions
): SafeMessagePortResult<T> {
  const _emitter = Emitter<MessagePortEvents<T>>()
  let _closed = false
  let _heartbeatController: AbortController | undefined
  let _lastPong = Date.now()
  let _heartbeatTimer: ReturnType<typeof globalThis.setInterval> | undefined

  // Cleanup (shared by close, goodbye, heartbeat timeout)
  const cleanup = (): void => {
    port.removeEventListener('message', onMessage)
    port.removeEventListener('messageerror', onMessageError)
    _emitter[Symbol.dispose]()
    port.close()
  }

  // Internal message handler
  const handleInternalMessage = (msg: InternalMessage): void => {
    switch (msg.type) {
      case 'goodbye':
        if (_closed) {
          return
        }
        _closed = true
        _heartbeatController?.abort()
        if (_heartbeatTimer !== undefined) {
          clearInterval(_heartbeatTimer)
          _heartbeatTimer = undefined
        }
        _emitter.emit('close')
        cleanup()
        break
      case 'ping':
        try {
          port.postMessage({ [INTERNAL_MARKER]: true, type: 'pong' })
        } catch {
          // Port may already be closed
        }
        break
      case 'pong':
        _lastPong = Date.now()
        break
    }
  }

  // Message listener (filters internal messages)
  const onMessage = (event: Event): void => {
    const data = (event as MessageEvent).data
    if (isInternalMessage(data)) {
      handleInternalMessage(data)
      return
    }
    _emitter.emit('message', event as MessageEvent<T>)
  }
  const onMessageError = (event: Event): void => {
    _emitter.emit('messageerror', event as MessageEvent)
  }

  port.addEventListener('message', onMessage)
  port.addEventListener('messageerror', onMessageError)
  port.start()

  // Close (goodbye protocol)
  const close = (): void => {
    if (_closed) {
      return
    }
    _closed = true

    // Stop heartbeat
    _heartbeatController?.abort()
    if (_heartbeatTimer !== undefined) {
      clearInterval(_heartbeatTimer)
      _heartbeatTimer = undefined
    }

    // Send goodbye to remote side
    try {
      port.postMessage({ [INTERNAL_MARKER]: true, type: 'goodbye' })
    } catch {
      // Port may already be closed
    }

    // Fire local close event
    _emitter.emit('close')

    cleanup()
  }

  // Heartbeat protocol (optional)
  if (options?.heartbeat) {
    _heartbeatController = new AbortController()
    const interval = options.heartbeat.interval ?? 1000
    const timeout = options.heartbeat.timeout ?? 3000

    _heartbeatTimer = globalThis.setInterval(() => {
      if (_heartbeatController?.signal.aborted) {
        if (_heartbeatTimer !== undefined) {
          clearInterval(_heartbeatTimer)
          _heartbeatTimer = undefined
        }
        return
      }

      // Timeout check
      if (Date.now() - _lastPong > timeout) {
        if (!_closed) {
          _closed = true
          _heartbeatController!.abort()
          if (_heartbeatTimer !== undefined) {
            clearInterval(_heartbeatTimer)
            _heartbeatTimer = undefined
          }
          _emitter.emit('close')
          cleanup()
        }
        return
      }

      // Send ping
      try {
        port.postMessage({ [INTERNAL_MARKER]: true, type: 'ping' })
      } catch {
        // Port already closed
      }
    }, interval)
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
