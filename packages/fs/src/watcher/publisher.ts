/**
 * FileSystemPublisher - Main Thread side of the Pub-Sub filesystem sync.
 *
 * Sends V_FS_* protocol messages to Worker targets (Service Worker, Web Worker).
 * Provides a `node:fs`-like API for reduced cognitive load.
 *
 * @module watcher/publisher
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { FSInitMessage, FSWriteMessage, FileSystemSyncMessage } from './protocol.ts'

/**
 * A postMessage target compatible like Service Worker and Web Worker APIs.
 */
export interface FileSystemPublisherTarget {
  postMessage(message: any, transfer: Transferable[]): void
  postMessage(message: any, options?: StructuredSerializeOptions): void
}

/**
 * Publisher for broadcasting filesystem operations to Workers.
 *
 * API is modeled after `node:fs` for familiarity:
 * - `writeFile` accepts both `string` (text) and `ArrayBuffer` (binary)
 * - `unlink` deletes a file
 * - `mkdir` creates a directory
 */
export interface FileSystemPublisher {
  /**
   * Write a file. Encoding is inferred: string → text, ArrayBuffer → binary.
   *
   * @param path - Path of the file to write. Must not end with '/' (directories use mkdir with path ending in '/').
   * @param content - Content of the file. Type determines encoding:
   *   - string: UTF-8 text content
   *   - ArrayBuffer: binary content (transferred via postMessage's transfer list for zero-copy performance)
   */
  writeFile(path: string, content: string | ArrayBuffer): void
  /**
   * Delete a file.
   *
   * @param path - Path of the file to delete. Must not end with '/' (directories use mkdir with path ending in '/').
   */
  unlink(path: string): void
  /**
   * Create a directory.
   *
   * @param path - Path of the directory to create. Must end with '/' to distinguish from files.
   */
  mkdir(path: string): void
  /**
   * Initialize files in bulk.
   *
   * @param files - Text files: path -> UTF-8 string content
   * @param binaryFiles - Binary files: path -> ArrayBuffer content (transferred)
   */
  initFiles(files?: Record<string, string>, binaryFiles?: Record<string, ArrayBuffer>): void
  /**
   * Add a postMessage target.
   *
   * @param target - The target to add (e.g. Worker, ServiceWorker)
   */
  addTarget(target: FileSystemPublisherTarget): void
  /**
   * Remove a postMessage target.
   *
   * @param target - The target to remove (e.g. Worker, ServiceWorker)
   */
  removeTarget(target: FileSystemPublisherTarget): void
}

/**
 * Create a {@link FileSystemPublisher} instance.
 *
 * @param targets - Initial postMessage targets (e.g. Worker, ServiceWorker)
 * @returns FileSystemPublisher instance
 */
export function createFileSystemPublisher(
  targets?: FileSystemPublisherTarget[]
): Readonly<FileSystemPublisher> {
  const _targets = new Set<FileSystemPublisherTarget>(targets)

  function broadcast(message: FileSystemSyncMessage, transfer: Transferable[] = []) {
    for (const target of _targets) {
      target.postMessage(message, transfer)
    }
  }

  const instance: FileSystemPublisher = {
    writeFile(path, content) {
      if (typeof content === 'string') {
        broadcast({ type: 'V_FS_WRITE', path, encoding: 'text', content })
      } else {
        // ArrayBuffer: transfer list for zero-copy.
        // First target gets the original buffer, subsequent targets get copies.
        const targetList = [..._targets]
        for (let i = 0; i < targetList.length; i++) {
          const buf = i === 0 ? content : content.slice(0)
          const msg: FSWriteMessage = { type: 'V_FS_WRITE', path, encoding: 'binary', content: buf }
          // @ts-expect-error - postMessage with transfer list is supported by both Worker and ServiceWorker targets, but TypeScript typings may not reflect this accurately.
          targetList[i].postMessage(msg, [buf])
        }
      }
    },

    unlink(path) {
      broadcast({ type: 'V_FS_UNLINK', path })
    },

    mkdir(path) {
      broadcast({ type: 'V_FS_MKDIR', path })
    },

    initFiles(files, binaryFiles) {
      const transfer: Transferable[] = binaryFiles ? Object.values(binaryFiles) : []
      const msg: FSInitMessage = { type: 'V_FS_INIT' }
      if (files) {
        msg.files = files
      }
      if (binaryFiles) {
        msg.binaryFiles = binaryFiles
      }
      broadcast(msg, transfer)
    },

    addTarget(target) {
      _targets.add(target)
    },

    removeTarget(target) {
      _targets.delete(target)
    }
  }

  return Object.freeze(instance)
}
