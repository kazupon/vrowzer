/**
 * FileSystemSubscriber - Worker side of the Pub-Sub filesystem sync.
 *
 * Receives V_FS_* protocol messages, updates the @vrowzer/fs memfs volume,
 * and notifies the VirtualFSWatcher to trigger chokidar-compatible events.
 *
 * @module watcher/subscriber
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { FSContentEncoding, FileSystemSyncMessage } from './protocol.ts'
import type { VirtualFSWatcher } from './virtual.ts'
import { createVirtualFSWatcher } from './virtual.ts'

/**
 * Minimal fs interface required by FileSystemSubscriber.
 */
export interface FileSystemInterfaces {
  existsSync(path: string): boolean
  writeFileSync(path: string, data: any, options?: any): void
  unlinkSync(path: string): void
  mkdirSync(path: string, options?: any): void
}

/**
 * Subscriber for processing filesystem sync messages in Workers.
 */
export interface FileSystemSubscriber {
  /**
   * chokidar compatible {@link VirtualFSWatcher | FSWatcher}.
   */
  readonly watcher: VirtualFSWatcher
  /**
   * Process a V_FS_* protocol message. Updates vol and notifies watcher.
   */
  handleMessage(message: FileSystemSyncMessage): void
}

/**
 * Options for {@link createFileSystemSubscriber}.
 */
export interface CreateFileSystemSubscriberOptions {
  /**
   * External VirtualFSWatcher instance to use.
   * If provided, the subscriber will use this watcher instead of creating a new one.
   * This allows creating the watcher early (e.g. for DevEnvironment.init)
   * and the subscriber later (e.g. after transformer loads).
   */
  watcher?: VirtualFSWatcher
}

/**
 * Create a {@link FileSystemSubscriber} instance.
 *
 * @param fs - fs instance to use for vol operations.
 *   Must be explicitly passed to avoid module instance mismatch when bundlers
 *   create separate copies of @vrowzer/fs.
 * @param options - Options including optional external watcher
 * @returns FileSystemSubscriber instance with a VirtualFSWatcher
 */
export function createFileSystemSubscriber(
  fs: FileSystemInterfaces,
  options?: CreateFileSystemSubscriberOptions
): Readonly<FileSystemSubscriber> {
  const watcher = options?.watcher ?? createVirtualFSWatcher()

  function ensureDir(filePath: string): void {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  function writeToVol(
    path: string,
    encoding: FSContentEncoding,
    content: string | ArrayBuffer
  ): void {
    ensureDir(path)
    if (encoding === 'binary') {
      fs.writeFileSync(path, new Uint8Array(content as ArrayBuffer))
    } else {
      fs.writeFileSync(path, content as string, { encoding: 'utf8' })
    }
  }

  function handleMessage(message: FileSystemSyncMessage): void {
    switch (message.type) {
      case 'V_FS_WRITE': {
        const exists = fs.existsSync(message.path)
        writeToVol(message.path, message.encoding, message.content)
        watcher.notify(exists ? 'change' : 'add', message.path)
        break
      }

      case 'V_FS_UNLINK': {
        if (fs.existsSync(message.path)) {
          fs.unlinkSync(message.path)
          watcher.notify('unlink', message.path)
        }
        break
      }

      case 'V_FS_MKDIR': {
        fs.mkdirSync(message.path, { recursive: true })
        watcher.notify('addDir', message.path)
        break
      }

      case 'V_FS_INIT': {
        if (message.files) {
          for (const [path, content] of Object.entries(message.files)) {
            writeToVol(path, 'text', content)
            watcher.notify('add', path)
          }
        }
        if (message.binaryFiles) {
          for (const [path, content] of Object.entries(message.binaryFiles)) {
            writeToVol(path, 'binary', content)
            watcher.notify('add', path)
          }
        }
        break
      }
    }
  }

  return Object.freeze({ watcher, handleMessage })
}
