import { describe, expect, test } from 'vitest'
import type { FileSystemPublisherTarget } from './publisher.ts'
import { createFileSystemPublisher } from './publisher.ts'

function createMockTarget(): FileSystemPublisherTarget & {
  calls: { message: any; transfer?: any }[]
} {
  const calls: { message: any; transfer?: any }[] = []
  return {
    calls,
    postMessage(message: any, transfer?: any) {
      calls.push({ message, transfer })
    }
  }
}

describe('FileSystemPublisher', () => {
  describe('target management', () => {
    test('addTarget() adds a target', () => {
      const publisher = createFileSystemPublisher()
      const target = createMockTarget()
      publisher.addTarget(target)

      publisher.writeFile('/test.js', 'content')

      expect(target.calls).toHaveLength(1)
    })

    test('removeTarget() removes a target', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      publisher.removeTarget(target)

      publisher.writeFile('/test.js', 'content')

      expect(target.calls).toHaveLength(0)
    })

    test('removed target does not receive messages', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])
      publisher.removeTarget(target1)

      publisher.writeFile('/test.js', 'content')

      expect(target1.calls).toHaveLength(0)
      expect(target2.calls).toHaveLength(1)
    })
  })

  describe('writeFile', () => {
    test('string content sends V_FS_WRITE with encoding: "text"', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.writeFile('/main.js', 'export const x = 1')

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'export const x = 1'
      })
    })

    test('ArrayBuffer content sends V_FS_WRITE with encoding: "binary" and transfer list', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      const buffer = new ArrayBuffer(4)

      publisher.writeFile('/image.png', buffer)

      expect(target.calls[0]!.message.type).toBe('V_FS_WRITE')
      expect(target.calls[0]!.message.encoding).toBe('binary')
      expect(target.calls[0]!.message.content).toBeInstanceOf(ArrayBuffer)
      expect(target.calls[0]!.transfer).toEqual([buffer])
    })

    test('broadcasts the same message to multiple targets', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])

      publisher.writeFile('/test.js', 'content')

      expect(target1.calls[0]!.message).toEqual(target2.calls[0]!.message)
    })

    test('ArrayBuffer with multiple targets: first gets original, rest get copies', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])
      const buffer = new ArrayBuffer(4)

      publisher.writeFile('/image.png', buffer)

      // Both receive binary messages
      expect(target1.calls[0]!.message.encoding).toBe('binary')
      expect(target2.calls[0]!.message.encoding).toBe('binary')

      // First target gets the original buffer
      expect(target1.calls[0]!.transfer[0]).toBe(buffer)
      // Second target gets a copy (different reference)
      expect(target2.calls[0]!.transfer[0]).not.toBe(buffer)
      expect(target2.calls[0]!.transfer[0].byteLength).toBe(buffer.byteLength)
    })
  })

  describe('unlink', () => {
    test('sends V_FS_UNLINK message', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.unlink('/old-file.js')

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_UNLINK',
        path: '/old-file.js'
      })
    })
  })

  describe('mkdir', () => {
    test('sends V_FS_MKDIR message', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.mkdir('/new-dir')

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_MKDIR',
        path: '/new-dir'
      })
    })
  })

  describe('initFiles', () => {
    test('sends V_FS_INIT message with text files', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      const files = { '/main.js': 'code', '/config.json': '{}' }

      publisher.initFiles(files)

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_INIT',
        files
      })
    })

    test('sends V_FS_INIT message with binaryFiles', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      const wasmBuffer = new ArrayBuffer(8)
      const binaryFiles = { '/app.wasm': wasmBuffer }

      publisher.initFiles(undefined, binaryFiles)

      expect(target.calls[0]!.message.type).toBe('V_FS_INIT')
      expect(target.calls[0]!.message.binaryFiles).toEqual(binaryFiles)
    })

    test('binaryFiles ArrayBuffers are included in transfer list', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      const buf1 = new ArrayBuffer(4)
      const buf2 = new ArrayBuffer(8)
      const binaryFiles = { '/a.wasm': buf1, '/b.wasm': buf2 }

      publisher.initFiles(undefined, binaryFiles)

      expect(target.calls[0]!.transfer).toContain(buf1)
      expect(target.calls[0]!.transfer).toContain(buf2)
    })
  })
})
