import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

describe('test-stream-pipe-unpipe-streams', () => {
  it('should unpipe in reverse order', () => {
    const source = new Readable({ read: () => {} })
    const dest1 = new Writable({ write: () => {} })
    const dest2 = new Writable({ write: () => {} })
    source.pipe(dest1)
    source.pipe(dest2)
    dest1.on('unpipe', mustCall() as (...args: unknown[]) => void)
    dest2.on('unpipe', mustCall() as (...args: unknown[]) => void)
    expect((source as any)._readableState.pipes[0]).toBe(dest1)
    expect((source as any)._readableState.pipes[1]).toBe(dest2)
    expect((source as any)._readableState.pipes.length).toBe(2)

    // Should be able to unpipe them in the reverse order that they were piped.
    source.unpipe(dest2)
    expect((source as any)._readableState.pipes).toEqual([dest1])
    expect((source as any)._readableState.pipes).not.toBe(dest2)
    dest2.on('unpipe', mustNotCall() as (...args: unknown[]) => void)
    source.unpipe(dest2)
    source.unpipe(dest1)
    expect((source as any)._readableState.pipes.length).toBe(0)
  })

  it('should cleanup all listeners when unpipe() is called without args', () => {
    const source = new Readable({ read: () => {} })
    const dest1 = new Writable({ write: () => {} })
    const dest2 = new Writable({ write: () => {} })

    let destCount = 0
    const srcCheckEventNames = ['end', 'data']
    const destCheckEventNames = ['close', 'finish', 'drain', 'error', 'unpipe']

    const checkSrcCleanup = mustCall(() => {
      expect((source as any)._readableState.pipes.length).toBe(0)
      expect((source as any)._readableState.flowing).toBe(false)
      srcCheckEventNames.forEach(eventName => {
        expect(source.listenerCount(eventName)).toBe(0)
      })
    }) as (...args: unknown[]) => void

    function checkDestCleanup(dest: Writable) {
      ++destCount
      source.pipe(dest)
      const unpipeChecker = mustCall(() => {
        expect(dest.listeners('unpipe')).toEqual([unpipeChecker])
        dest.removeListener('unpipe', unpipeChecker as (...args: unknown[]) => void)
        destCheckEventNames.forEach(eventName => {
          expect(dest.listenerCount(eventName)).toBe(0)
        })
        if (--destCount === 0) checkSrcCleanup()
      }) as (...args: unknown[]) => void
      dest.on('unpipe', unpipeChecker)
    }
    checkDestCleanup(dest1)
    checkDestCleanup(dest2)
    source.unpipe()
  })

  it('should emit pause after unpipe', () =>
    new Promise<void>(resolve => {
      const src = new Readable({ read: () => {} })
      const dst = new Writable({ write: () => {} })
      src.pipe(dst)
      src.on(
        'resume',
        mustCall(() => {
          src.on(
            'pause',
            mustCall(() => {
              resolve()
            }) as (...args: unknown[]) => void
          )
          src.unpipe(dst)
        }) as (...args: unknown[]) => void
      )
    }))
})
