import { describe, expect, test, vi } from 'vitest'
import { createVirtualFSWatcher } from './virtual.ts'

describe('VirtualFSWatcher', () => {
  describe('notify', () => {
    test('notify("change", path) fires "change" event', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('change', handler)

      watcher.notify('change', '/main.js')

      expect(handler).toHaveBeenCalledWith('/main.js')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('notify("add", path) fires "add" event', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('add', handler)

      watcher.notify('add', '/new-file.ts')

      expect(handler).toHaveBeenCalledWith('/new-file.ts')
    })

    test('notify() also fires "all" event with (eventName, path)', () => {
      const watcher = createVirtualFSWatcher()
      const allHandler = vi.fn()
      watcher.on('all', allHandler)

      watcher.notify('change', '/main.js')

      expect(allHandler).toHaveBeenCalledWith('change', '/main.js')
    })

    test('notify() does not fire events after close()', async () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('change', handler)

      await watcher.close()
      watcher.notify('change', '/main.js')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('on / off', () => {
    test('on() registers a listener that is called on event', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('change', handler)

      watcher.emit('change', '/test.js')

      expect(handler).toHaveBeenCalledWith('/test.js')
    })

    test('off() removes a listener so it is no longer called', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('change', handler)
      watcher.off('change', handler)

      watcher.emit('change', '/test.js')

      expect(handler).not.toHaveBeenCalled()
    })

    test('multiple listeners can be registered for the same event', () => {
      const watcher = createVirtualFSWatcher()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      watcher.on('change', handler1)
      watcher.on('change', handler2)

      watcher.emit('change', '/test.js')

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('once', () => {
    test('once() fires only once and auto-unregisters', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.once('change', handler)

      watcher.emit('change', '/test.js')
      watcher.emit('change', '/test.js')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('emit', () => {
    test('emit() directly fires an event', () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('custom', handler)

      watcher.emit('custom', 'arg1', 'arg2')

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
    })

    test('emit() returns false when no listeners exist', () => {
      const watcher = createVirtualFSWatcher()

      expect(watcher.emit('change', '/test.js')).toBe(false)
    })

    test('emit() returns true when listeners exist', () => {
      const watcher = createVirtualFSWatcher()
      watcher.on('change', () => {})

      expect(watcher.emit('change', '/test.js')).toBe(true)
    })
  })

  describe('removeAllListeners', () => {
    test('with event name clears only that event listeners', () => {
      const watcher = createVirtualFSWatcher()
      const changeHandler = vi.fn()
      const addHandler = vi.fn()
      watcher.on('change', changeHandler)
      watcher.on('add', addHandler)

      watcher.removeAllListeners('change')

      watcher.emit('change', '/test.js')
      watcher.emit('add', '/new.js')

      expect(changeHandler).not.toHaveBeenCalled()
      expect(addHandler).toHaveBeenCalledTimes(1)
    })

    test('without arguments clears all listeners', () => {
      const watcher = createVirtualFSWatcher()
      const changeHandler = vi.fn()
      const addHandler = vi.fn()
      watcher.on('change', changeHandler)
      watcher.on('add', addHandler)

      watcher.removeAllListeners()

      watcher.emit('change', '/test.js')
      watcher.emit('add', '/new.js')

      expect(changeHandler).not.toHaveBeenCalled()
      expect(addHandler).not.toHaveBeenCalled()
    })
  })

  describe('listener inspection', () => {
    test('listeners() returns array of registered listeners', () => {
      const watcher = createVirtualFSWatcher()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      watcher.on('change', handler1)
      watcher.on('change', handler2)

      const result = watcher.listeners('change')

      expect(result).toHaveLength(2)
      expect(result).toContain(handler1)
      expect(result).toContain(handler2)
    })

    test('listenerCount() returns the number of registered listeners', () => {
      const watcher = createVirtualFSWatcher()
      watcher.on('change', () => {})
      watcher.on('change', () => {})
      watcher.on('add', () => {})

      expect(watcher.listenerCount('change')).toBe(2)
      expect(watcher.listenerCount('add')).toBe(1)
      expect(watcher.listenerCount('unlink')).toBe(0)
    })

    test('eventNames() returns array of registered event names', () => {
      const watcher = createVirtualFSWatcher()
      watcher.on('change', () => {})
      watcher.on('add', () => {})

      const names = watcher.eventNames()

      expect(names).toContain('change')
      expect(names).toContain('add')
      expect(names).toHaveLength(2)
    })
  })

  describe('chokidar FSWatcher interface (no-op)', () => {
    test('add() returns the watcher', () => {
      const watcher = createVirtualFSWatcher()
      expect(watcher.add('/some/path')).toBe(watcher)
    })

    test('unwatch() returns the watcher', () => {
      const watcher = createVirtualFSWatcher()
      expect(watcher.unwatch('/some/path')).toBe(watcher)
    })

    test('getWatched() returns an empty object', () => {
      const watcher = createVirtualFSWatcher()
      expect(watcher.getWatched()).toEqual({})
    })

    test('ref() / unref() return the watcher', () => {
      const watcher = createVirtualFSWatcher()
      expect(watcher.ref()).toBe(watcher)
      expect(watcher.unref()).toBe(watcher)
    })

    test('close() prevents events from firing', async () => {
      const watcher = createVirtualFSWatcher()
      const handler = vi.fn()
      watcher.on('change', handler)

      await watcher.close()
      watcher.notify('change', '/test.js')

      expect(handler).not.toHaveBeenCalled()
      expect(watcher.listenerCount('change')).toBe(0)
    })
  })
})
