/**
 * readline browser tests
 *
 * Based on Node.js readline API behavior.
 */

import { describe, expect, it, vi } from 'vite-plus/test'
import {
  Interface,
  clearLine,
  clearScreenDown,
  createInterface,
  cursorTo,
  emitKeypressEvents,
  moveCursor,
  promises
} from './readline.ts'

function mockStream() {
  const chunks: string[] = []
  return {
    write(data: string, cb?: () => void) {
      chunks.push(data)
      if (typeof cb === 'function') {
        cb()
      }
      return true
    },
    chunks
  }
}

describe('clearLine', () => {
  it('should write clear-to-beginning for dir < 0', () => {
    const s = mockStream()
    clearLine(s, -1)
    expect(s.chunks[0]).toBe('\x1b[1K')
  })

  it('should write clear-to-end for dir > 0', () => {
    const s = mockStream()
    clearLine(s, 1)
    expect(s.chunks[0]).toBe('\x1b[0K')
  })

  it('should write clear-entire-line for dir === 0', () => {
    const s = mockStream()
    clearLine(s, 0)
    expect(s.chunks[0]).toBe('\x1b[2K')
  })

  it('should call callback', () => {
    const s = mockStream()
    const cb = vi.fn()
    clearLine(s, 0, cb)
    expect(cb).toHaveBeenCalled()
  })

  it('should handle null stream', () => {
    expect(clearLine(null, 0)).toBe(true)
  })
})

describe('clearScreenDown', () => {
  it('should write clear-screen-down escape', () => {
    const s = mockStream()
    clearScreenDown(s)
    expect(s.chunks[0]).toBe('\x1b[0J')
  })

  it('should handle null stream', () => {
    expect(clearScreenDown(null)).toBe(true)
  })
})

describe('cursorTo', () => {
  it('should move cursor to column x', () => {
    const s = mockStream()
    cursorTo(s, 5)
    expect(s.chunks[0]).toBe('\x1b[6G')
  })

  it('should move cursor to x, y', () => {
    const s = mockStream()
    cursorTo(s, 5, 10)
    expect(s.chunks[0]).toBe('\x1b[11;6H')
  })

  it('should accept callback as y parameter', () => {
    const s = mockStream()
    const cb = vi.fn()
    cursorTo(s, 5, cb)
    expect(s.chunks[0]).toBe('\x1b[6G')
    expect(cb).toHaveBeenCalled()
  })

  it('should handle null stream', () => {
    expect(cursorTo(null, 0)).toBe(true)
  })
})

describe('moveCursor', () => {
  it('should move cursor left', () => {
    const s = mockStream()
    moveCursor(s, -3, 0)
    expect(s.chunks[0]).toBe('\x1b[3D')
  })

  it('should move cursor right', () => {
    const s = mockStream()
    moveCursor(s, 3, 0)
    expect(s.chunks[0]).toBe('\x1b[3C')
  })

  it('should move cursor up', () => {
    const s = mockStream()
    moveCursor(s, 0, -2)
    expect(s.chunks[0]).toBe('\x1b[2A')
  })

  it('should move cursor down', () => {
    const s = mockStream()
    moveCursor(s, 0, 2)
    expect(s.chunks[0]).toBe('\x1b[2B')
  })

  it('should combine dx and dy', () => {
    const s = mockStream()
    moveCursor(s, 3, -2)
    expect(s.chunks[0]).toBe('\x1b[3C\x1b[2A')
  })

  it('should handle null stream', () => {
    expect(moveCursor(null, 0, 0)).toBe(true)
  })

  it('should handle zero movement', () => {
    expect(moveCursor(mockStream(), 0, 0)).toBe(true)
  })
})

describe('emitKeypressEvents', () => {
  it('should not throw', () => {
    expect(() => emitKeypressEvents({})).not.toThrow()
  })
})

describe('createInterface', () => {
  it('should return an Interface instance', () => {
    const rl = createInterface({})
    expect(rl).toBeInstanceOf(Interface)
    rl.close()
  })
})

describe('Interface', () => {
  it('should set and get prompt', () => {
    const rl = new Interface({})
    rl.setPrompt('>> ')
    expect(rl.getPrompt()).toBe('>> ')
    rl.close()
  })

  it('should default prompt to "> "', () => {
    const rl = new Interface({})
    expect(rl.getPrompt()).toBe('> ')
    rl.close()
  })

  it('prompt should write to output', () => {
    const s = mockStream()
    const rl = new Interface({ output: s })
    rl.prompt()
    expect(s.chunks[0]).toBe('> ')
    rl.close()
  })

  it('close should emit close event', () => {
    const rl = new Interface({})
    const fn = vi.fn()
    rl.on('close', fn)
    rl.close()
    expect(fn).toHaveBeenCalled()
  })

  it('close should be idempotent', () => {
    const rl = new Interface({})
    const fn = vi.fn()
    rl.on('close', fn)
    rl.close()
    rl.close()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('pause should emit pause event', () => {
    const rl = new Interface({})
    const fn = vi.fn()
    rl.on('pause', fn)
    rl.pause()
    expect(fn).toHaveBeenCalled()
    rl.close()
  })

  it('resume should emit resume event', () => {
    const rl = new Interface({})
    rl.pause()
    const fn = vi.fn()
    rl.on('resume', fn)
    rl.resume()
    expect(fn).toHaveBeenCalled()
    rl.close()
  })

  it('question should write query to output and listen for line', () => {
    const s = mockStream()
    const rl = new Interface({ output: s })
    const fn = vi.fn()
    rl.question('Name? ', fn)
    expect(s.chunks[0]).toBe('Name? ')
    rl.emit('line', 'Alice')
    expect(fn).toHaveBeenCalledWith('Alice')
    rl.close()
  })

  it('write should append to line', () => {
    const rl = new Interface({})
    rl.write('hello')
    expect(rl.line).toBe('hello')
    rl.write(' world')
    expect(rl.line).toBe('hello world')
    rl.close()
  })

  it('cursor should track line length', () => {
    const rl = new Interface({})
    rl.write('abc')
    expect(rl.cursor).toBe(3)
    rl.close()
  })

  it('closed should be true after close', () => {
    const rl = new Interface({})
    expect(rl.closed).toBe(false)
    rl.close()
    expect(rl.closed).toBe(true)
  })

  it('should support AbortSignal', () => {
    const ac = new AbortController()
    const rl = new Interface({ signal: ac.signal })
    const fn = vi.fn()
    rl.on('close', fn)
    ac.abort()
    expect(fn).toHaveBeenCalled()
  })

  it('should be async iterable', async () => {
    const rl = new Interface({})
    const lines: string[] = []

    const iterPromise = (async () => {
      for await (const line of rl) {
        lines.push(line)
        if (lines.length === 2) {
          break
        }
      }
    })()

    rl.emit('line', 'first')
    rl.emit('line', 'second')

    await iterPromise
    expect(lines).toEqual(['first', 'second'])
    rl.close()
  })
})

describe('promises', () => {
  it('createInterface should return a PromiseInterface', () => {
    const rl = promises.createInterface({})
    expect(rl).toBeInstanceOf(Interface)
    rl.close()
  })

  it('question should return a Promise', async () => {
    const s = mockStream()
    const rl = promises.createInterface({ output: s })
    const p = rl.question('Name? ')
    expect(p).toBeInstanceOf(Promise)
    rl.emit('line', 'Bob')
    const answer = await p
    expect(answer).toBe('Bob')
    rl.close()
  })

  it('Readline should buffer and commit', async () => {
    const s = mockStream()
    const r = new promises.Readline(s)
    r.cursorTo(5).moveCursor(0, -1).clearLine(0)
    expect(s.chunks).toHaveLength(0)
    await r.commit()
    expect(s.chunks).toHaveLength(1)
    expect(s.chunks[0]).toContain('\x1b[')
  })

  it('Readline rollback should clear pending', async () => {
    const s = mockStream()
    const r = new promises.Readline(s)
    r.cursorTo(5)
    r.rollback()
    await r.commit()
    expect(s.chunks[0]).toBe('')
  })
})
