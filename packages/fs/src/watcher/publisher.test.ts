import { describe, expect, onTestFinished, test } from 'vite-plus/test'
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

/**
 * A target that really transfers buffers, so that a transferred ArrayBuffer is detached.
 */
function createPortTarget(): { target: MessagePort; received: Promise<any> } {
  const channel = new MessageChannel()
  const received = new Promise<any>(resolve => {
    channel.port2.onmessage = event => resolve(event.data)
  })
  onTestFinished(() => {
    channel.port1.close()
    channel.port2.close()
  })
  return { target: channel.port1, received }
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

    test('ArrayBuffer content sends V_FS_WRITE with encoding: "binary" and transfers a copy', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer

      publisher.writeFile('/image.png', buffer)

      const { message, transfer } = target.calls[0]!
      expect(message.type).toBe('V_FS_WRITE')
      expect(message.encoding).toBe('binary')
      expect(message.content).toBeInstanceOf(ArrayBuffer)
      expect(message.content).not.toBe(buffer)
      expect(transfer).toEqual([message.content])
      expect(transfer[0]).toBe(message.content)
      expect([...new Uint8Array(message.content)]).toEqual([1, 2, 3, 4])
    })

    test('broadcasts the same message to multiple targets', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])

      publisher.writeFile('/test.js', 'content')

      expect(target1.calls[0]!.message).toEqual(target2.calls[0]!.message)
    })

    test('ArrayBuffer with multiple targets: every target gets its own copy', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer

      publisher.writeFile('/image.png', buffer)

      // Both receive binary messages
      expect(target1.calls[0]!.message.encoding).toBe('binary')
      expect(target2.calls[0]!.message.encoding).toBe('binary')

      // Neither target gets the caller's buffer, and the copies are not shared
      const copy1 = target1.calls[0]!.transfer[0]
      const copy2 = target2.calls[0]!.transfer[0]
      expect(copy1).not.toBe(buffer)
      expect(copy2).not.toBe(buffer)
      expect(copy1).not.toBe(copy2)
      expect([...new Uint8Array(copy1)]).toEqual([1, 2, 3, 4])
      expect([...new Uint8Array(copy2)]).toEqual([1, 2, 3, 4])
    })

    test('keeps the caller ArrayBuffer usable and delivers the same bytes to every target', async () => {
      const first = createPortTarget()
      const second = createPortTarget()
      const publisher = createFileSystemPublisher([first.target, second.target])
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer

      publisher.writeFile('/image.png', buffer)

      expect(buffer.byteLength).toBe(4)
      expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3, 4])
      for (const message of await Promise.all([first.received, second.received])) {
        expect(message).toMatchObject({
          type: 'V_FS_WRITE',
          path: '/image.png',
          encoding: 'binary'
        })
        expect([...new Uint8Array(message.content)]).toEqual([1, 2, 3, 4])
      }
    })

    test('sets the operation id on the message', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.writeFile('/main.js', 'export const x = 1', { id: 'op-1' })

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_WRITE',
        path: '/main.js',
        encoding: 'text',
        content: 'export const x = 1',
        id: 'op-1'
      })
    })

    test('sets the operation id on the binary message for every target', () => {
      const target1 = createMockTarget()
      const target2 = createMockTarget()
      const publisher = createFileSystemPublisher([target1, target2])

      publisher.writeFile('/image.png', new ArrayBuffer(4), { id: 'op-2' })

      expect(target1.calls[0]!.message.id).toBe('op-2')
      expect(target2.calls[0]!.message.id).toBe('op-2')
    })

    test('omits the operation id without the option', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.writeFile('/main.js', 'text')
      publisher.writeFile('/image.png', new ArrayBuffer(4))

      expect(target.calls[0]!.message).not.toHaveProperty('id')
      expect(target.calls[1]!.message).not.toHaveProperty('id')
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
      expect(target.calls[0]!.message).not.toHaveProperty('id')
    })

    test('sets the operation id on the message', () => {
      const target = createMockTarget()
      const publisher = createFileSystemPublisher([target])

      publisher.unlink('/old-file.js', { id: 'op-3' })

      expect(target.calls[0]!.message).toEqual({
        type: 'V_FS_UNLINK',
        path: '/old-file.js',
        id: 'op-3'
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
