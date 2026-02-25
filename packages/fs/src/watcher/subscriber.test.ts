import { beforeEach, describe, expect, test, vi } from 'vitest'
import { existsSync, readFileSync, vol } from '../index.ts'
import { createFileSystemSubscriber } from './subscriber.ts'

describe('FileSystemSubscriber', () => {
  beforeEach(() => {
    vol.reset()
  })

  describe('V_FS_WRITE', () => {
    test('new file writes to vol and fires watcher "add" event', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('add', handler)

      handleMessage({
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'export const x = 1'
      })

      expect(readFileSync('/main.js', 'utf8')).toBe('export const x = 1')
      expect(handler).toHaveBeenCalledWith('/main.js')
    })

    test('existing file overwrites vol and fires watcher "change" event', () => {
      vol.fromJSON({ '/main.js': 'old content' })
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const changeHandler = vi.fn()
      const addHandler = vi.fn()
      watcher.on('change', changeHandler)
      watcher.on('add', addHandler)

      handleMessage({
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'new content'
      })

      expect(readFileSync('/main.js', 'utf8')).toBe('new content')
      expect(changeHandler).toHaveBeenCalledWith('/main.js')
      expect(addHandler).not.toHaveBeenCalled()
    })

    test('encoding: "binary" writes as Uint8Array to vol', () => {
      const { handleMessage } = createFileSystemSubscriber()
      const buffer = new ArrayBuffer(4)
      new Uint8Array(buffer).set([1, 2, 3, 4])

      handleMessage({ type: 'V_FS_WRITE', path: '/data.bin', encoding: 'binary', content: buffer })

      const result = readFileSync('/data.bin')
      expect(result[0]).toBe(1)
      expect(result[1]).toBe(2)
      expect(result[2]).toBe(3)
      expect(result[3]).toBe(4)
    })

    test('auto-creates parent directories if they do not exist', () => {
      const { handleMessage } = createFileSystemSubscriber()

      handleMessage({
        type: 'V_FS_WRITE',
        path: '/deep/nested/file.js',
        encoding: 'text',
        content: 'content'
      })

      expect(existsSync('/deep/nested/file.js')).toBe(true)
      expect(readFileSync('/deep/nested/file.js', 'utf8')).toBe('content')
    })
  })

  describe('V_FS_UNLINK', () => {
    test('existing file is deleted from vol and fires watcher "unlink" event', () => {
      vol.fromJSON({ '/to-delete.js': 'content' })
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('unlink', handler)

      handleMessage({ type: 'V_FS_UNLINK', path: '/to-delete.js' })

      expect(existsSync('/to-delete.js')).toBe(false)
      expect(handler).toHaveBeenCalledWith('/to-delete.js')
    })

    test('non-existent file does not fire event', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('unlink', handler)

      handleMessage({ type: 'V_FS_UNLINK', path: '/nonexistent.js' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('V_FS_MKDIR', () => {
    test('creates directory and fires watcher "addDir" event', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('addDir', handler)

      handleMessage({ type: 'V_FS_MKDIR', path: '/new-dir' })

      expect(existsSync('/new-dir')).toBe(true)
      expect(handler).toHaveBeenCalledWith('/new-dir')
    })

    test('creates deeply nested paths recursively', () => {
      const { handleMessage } = createFileSystemSubscriber()

      handleMessage({ type: 'V_FS_MKDIR', path: '/a/b/c' })

      expect(existsSync('/a/b/c')).toBe(true)
    })
  })

  describe('V_FS_INIT', () => {
    test('text files are written to vol and each fires "add" event', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('add', handler)

      handleMessage({
        type: 'V_FS_INIT',
        files: {
          '/main.js': 'console.log("hello")',
          '/config.json': '{"key": "value"}'
        }
      })

      expect(readFileSync('/main.js', 'utf8')).toBe('console.log("hello")')
      expect(readFileSync('/config.json', 'utf8')).toBe('{"key": "value"}')
      expect(handler).toHaveBeenCalledTimes(2)
    })

    test('binaryFiles are written as Uint8Array to vol and each fires "add" event', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('add', handler)
      const buffer = new ArrayBuffer(2)
      new Uint8Array(buffer).set([0xff, 0xfe])

      handleMessage({
        type: 'V_FS_INIT',
        binaryFiles: { '/data.bin': buffer }
      })

      const result = readFileSync('/data.bin')
      expect(result[0]).toBe(0xff)
      expect(result[1]).toBe(0xfe)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('mixed text and binary files are both processed', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('add', handler)
      const buffer = new ArrayBuffer(1)

      handleMessage({
        type: 'V_FS_INIT',
        files: { '/main.js': 'code' },
        binaryFiles: { '/icon.png': buffer }
      })

      expect(existsSync('/main.js')).toBe(true)
      expect(existsSync('/icon.png')).toBe(true)
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('watcher integration', () => {
    test('subscriber.watcher is a VirtualFSWatcher', () => {
      const { watcher } = createFileSystemSubscriber()
      expect(watcher).toBeDefined()
      expect(watcher.notify).toBeTypeOf('function')
      expect(watcher.on).toBeTypeOf('function')
      expect(watcher.close).toBeTypeOf('function')
    })

    test('watcher.on("change") receives V_FS_WRITE change events', () => {
      vol.fromJSON({ '/existing.js': 'old' })
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const handler = vi.fn()
      watcher.on('change', handler)

      handleMessage({ type: 'V_FS_WRITE', path: '/existing.js', encoding: 'text', content: 'new' })

      expect(handler).toHaveBeenCalledWith('/existing.js')
    })

    test('watcher.on("all") receives all events', () => {
      const { watcher, handleMessage } = createFileSystemSubscriber()
      const allHandler = vi.fn()
      watcher.on('all', allHandler)

      handleMessage({ type: 'V_FS_WRITE', path: '/file.js', encoding: 'text', content: 'x' })
      handleMessage({ type: 'V_FS_MKDIR', path: '/dir' })

      expect(allHandler).toHaveBeenCalledTimes(2)
      expect(allHandler).toHaveBeenCalledWith('add', '/file.js')
      expect(allHandler).toHaveBeenCalledWith('addDir', '/dir')
    })
  })
})
