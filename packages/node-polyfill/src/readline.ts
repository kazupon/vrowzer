/**
 * `node:readline` compatible entry point
 *
 * ANSI cursor/clear functions are fully implemented using escape sequences.
 * Interface provides a minimal EventEmitter-based implementation for
 * question/prompt/close/pause/resume workflows.
 *
 * @module readline
 */

/**
 * Forked from:
 * - node:readline (https://github.com/nodejs/node)
 * - node:internal/readline/callbacks.js
 * - node:internal/readline/utils.js
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { EventEmitter } from './events.ts'

type WritableStream = { write: (data: string, cb?: () => void) => boolean }

const kEscape = '\x1b'
const kClearToLineBeginning = `${kEscape}[1K`
const kClearToLineEnd = `${kEscape}[0K`
const kClearLine = `${kEscape}[2K`
const kClearScreenDown = `${kEscape}[0J`

export function clearLine(
  stream: WritableStream | null | undefined,
  dir: number,
  cb?: () => void
): boolean {
  if (stream == null) {
    if (typeof cb === 'function') queueMicrotask(cb)
    return true
  }
  const code = dir < 0 ? kClearToLineBeginning : dir > 0 ? kClearToLineEnd : kClearLine
  return stream.write(code, cb)
}

export function clearScreenDown(
  stream: WritableStream | null | undefined,
  cb?: () => void
): boolean {
  if (stream == null) {
    if (typeof cb === 'function') queueMicrotask(cb)
    return true
  }
  return stream.write(kClearScreenDown, cb)
}

export function cursorTo(
  stream: WritableStream | null | undefined,
  x: number,
  y?: number | (() => void),
  cb?: () => void
): boolean {
  if (typeof y === 'function') {
    cb = y
    y = undefined
  }
  if (stream == null || (typeof x !== 'number' && typeof y !== 'number')) {
    if (typeof cb === 'function') queueMicrotask(cb)
    return true
  }
  const data = typeof y !== 'number' ? `${kEscape}[${x + 1}G` : `${kEscape}[${y + 1};${x + 1}H`
  return stream.write(data, cb)
}

export function moveCursor(
  stream: WritableStream | null | undefined,
  dx: number,
  dy: number,
  cb?: () => void
): boolean {
  if (stream == null || !(dx || dy)) {
    if (typeof cb === 'function') queueMicrotask(cb)
    return true
  }
  let data = ''
  if (dx < 0) data += `${kEscape}[${-dx}D`
  else if (dx > 0) data += `${kEscape}[${dx}C`
  if (dy < 0) data += `${kEscape}[${-dy}A`
  else if (dy > 0) data += `${kEscape}[${dy}B`
  return stream.write(data, cb)
}

export function emitKeypressEvents(_stream: unknown, _iface?: unknown): void {}

interface InterfaceOptions {
  input?: unknown
  output?: WritableStream | null
  completer?: Function
  terminal?: boolean
  history?: string[]
  historySize?: number
  prompt?: string
  crlfDelay?: number
  escapeCodeTimeout?: number
  tabSize?: number
  signal?: AbortSignal
}

export class Interface extends EventEmitter {
  terminal: boolean
  input: unknown
  output: WritableStream | null
  #prompt: string
  #closed = false
  #paused = false
  #line = ''

  constructor(inputOrOptions?: InterfaceOptions | unknown, output?: WritableStream | null) {
    super()
    const opts = (
      typeof inputOrOptions === 'object' &&
      inputOrOptions !== null &&
      !Array.isArray(inputOrOptions)
        ? inputOrOptions
        : { input: inputOrOptions, output }
    ) as InterfaceOptions
    this.input = opts.input ?? null
    this.output = opts.output ?? null
    this.terminal = opts.terminal ?? false
    this.#prompt = opts.prompt ?? '> '

    if (opts.signal) {
      const onAbort = () => this.close()
      opts.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  get line(): string {
    return this.#line
  }
  get cursor(): number {
    return this.#line.length
  }
  get closed(): boolean {
    return this.#closed
  }

  setPrompt(prompt: string): void {
    this.#prompt = prompt
  }

  getPrompt(): string {
    return this.#prompt
  }

  prompt(_preserveCursor?: boolean): void {
    if (this.#closed) return
    if (this.output) this.output.write(this.#prompt)
  }

  question(query: string, optionsOrCb?: { signal?: AbortSignal } | Function, cb?: Function): void {
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb
    const options = typeof optionsOrCb === 'object' ? optionsOrCb : undefined

    if (this.#closed) {
      throw new Error('readline was closed')
    }

    if (this.output) this.output.write(query)

    const handler = (line: string) => {
      if (typeof callback === 'function') callback(line)
    }
    this.once('line', handler)

    if (options?.signal) {
      const onAbort = () => {
        this.removeListener('line', handler)
      }
      options.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  write(
    data: string | null,
    _key?: { ctrl?: boolean; meta?: boolean; shift?: boolean; name?: string }
  ): void {
    if (this.#closed) return
    if (data != null) {
      this.#line += data
    }
  }

  pause(): this {
    if (!this.#paused) {
      this.#paused = true
      this.emit('pause')
    }
    return this
  }

  resume(): this {
    if (this.#paused) {
      this.#paused = false
      this.emit('resume')
    }
    return this
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.emit('close')
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    const lines: string[] = []
    const waiting: Array<{ resolve: (v: IteratorResult<string>) => void }> = []
    let done = false

    this.on('line', (line: string) => {
      if (waiting.length > 0) {
        waiting.shift()!.resolve({ value: line, done: false })
      } else {
        lines.push(line)
      }
    })

    this.on('close', () => {
      done = true
      while (waiting.length > 0) {
        waiting.shift()!.resolve({ value: undefined as unknown as string, done: true })
      }
    })

    return {
      next: () => {
        if (lines.length > 0) {
          return Promise.resolve({ value: lines.shift()!, done: false })
        }
        if (done) {
          return Promise.resolve({ value: undefined as unknown as string, done: true })
        }
        return new Promise<IteratorResult<string>>(resolve => {
          waiting.push({ resolve })
        })
      },
      return: () => {
        this.close()
        return Promise.resolve({ value: undefined as unknown as string, done: true })
      },
      [Symbol.asyncIterator]() {
        return this
      }
    }
  }
}

export function createInterface(
  inputOrOptions?: InterfaceOptions | unknown,
  output?: WritableStream | null
): Interface {
  return new Interface(inputOrOptions, output)
}

class PromiseInterface extends Interface {
  question(query: string, options?: { signal?: AbortSignal }): Promise<string>
  question(
    query: string,
    optionsOrCb?: { signal?: AbortSignal } | Function,
    cb?: Function
  ): void | Promise<string> {
    if (typeof optionsOrCb === 'function' || typeof cb === 'function') {
      return super.question(query, optionsOrCb, cb)
    }
    return new Promise<string>((resolve, reject) => {
      super.question(query, optionsOrCb, (answer: string) => resolve(answer))
      if (optionsOrCb?.signal) {
        optionsOrCb.signal.addEventListener(
          'abort',
          () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          },
          { once: true }
        )
      }
    })
  }
}

class Readline {
  #stream: WritableStream
  #pending: string[] = []

  constructor(stream: WritableStream) {
    this.#stream = stream
  }

  cursorTo(x: number, y?: number): this {
    const code = typeof y !== 'number' ? `${kEscape}[${x + 1}G` : `${kEscape}[${y + 1};${x + 1}H`
    this.#pending.push(code)
    return this
  }

  moveCursor(dx: number, dy: number): this {
    let code = ''
    if (dx < 0) code += `${kEscape}[${-dx}D`
    else if (dx > 0) code += `${kEscape}[${dx}C`
    if (dy < 0) code += `${kEscape}[${-dy}A`
    else if (dy > 0) code += `${kEscape}[${dy}B`
    if (code) this.#pending.push(code)
    return this
  }

  clearLine(dir: number): this {
    const code = dir < 0 ? kClearToLineBeginning : dir > 0 ? kClearToLineEnd : kClearLine
    this.#pending.push(code)
    return this
  }

  clearScreenDown(): this {
    this.#pending.push(kClearScreenDown)
    return this
  }

  commit(): Promise<void> {
    return new Promise(resolve => {
      this.#stream.write(this.#pending.join(''), () => resolve())
      this.#pending.length = 0
    })
  }

  rollback(): this {
    this.#pending.length = 0
    return this
  }
}

export const promises = {
  createInterface(
    inputOrOptions?: InterfaceOptions | unknown,
    output?: WritableStream | null
  ): PromiseInterface {
    return new PromiseInterface(inputOrOptions, output)
  },
  Readline,
  Interface: PromiseInterface
}
