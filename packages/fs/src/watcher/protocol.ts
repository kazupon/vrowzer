/**
 * File System Sync Protocol
 *
 * Message types for synchronizing file operations between
 * Main Thread (Publisher) and Workers (Subscribers).
 *
 * @module watcher/protocol
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * File content encoding type.
 * - 'text': UTF-8 string content (JS, TS, JSON, CSS, HTML, etc.)
 * - 'binary': ArrayBuffer content (images, WASM, fonts, etc.)
 *
 * When encoding is 'binary', the content is an ArrayBuffer
 * and MUST be transferred via postMessage's transfer list
 * for zero-copy performance.
 */
export type FSContentEncoding = 'text' | 'binary'

/**
 * Main Thread -> Worker: Write (create or update) a file.
 *
 * For text files:
 *   { type: 'V_FS_WRITE', path: '/main.js', encoding: 'text', content: '...' }
 *   -> postMessage(message)
 *
 * For binary files:
 *   { type: 'V_FS_WRITE', path: '/image.png', encoding: 'binary', content: ArrayBuffer }
 *   -> postMessage(message, [message.content])  // transfer list
 */
export interface FSWriteMessage {
  type: 'V_FS_WRITE'
  /**
   * Path of the file to write. Must not end with '/' (directories use FS_MKDIR with path ending in '/').
   */
  path: string
  /**
   * Encoding of the content. Determines how the Worker should interpret the content.
   */
  encoding: FSContentEncoding
  /**
   * Content of the file. Type depends on encoding:
   * - 'text': UTF-8 string content
   * - 'binary': ArrayBuffer content (transferred via postMessage's transfer list)
   */
  content: string | ArrayBuffer
}

/**
 * Main Thread -> Worker: Delete a file.
 */
export interface FSUnlinkMessage {
  type: 'V_FS_UNLINK'
  /**
   * Path of the file to delete. Must not end with '/' (directories use FS_MKDIR with path ending in '/').
   */
  path: string
}

/**
 * Main Thread -> Worker: Create a directory.
 */
export interface FSMkdirMessage {
  type: 'V_FS_MKDIR'
  /**
   * Path of the directory to create. Must end with '/' to distinguish from files.
   */
  path: string
}

/**
 * Main Thread -> Worker: Initialize files in bulk.
 * Used during setup to populate the virtual filesystem.
 *
 * Text files are in `files`, binary files are in `binaryFiles`.
 * Binary ArrayBuffers are transferred via postMessage's transfer list.
 */
export interface FSInitMessage {
  type: 'V_FS_INIT'
  /**
   * Text files: path -> UTF-8 string content
   */
  files?: Record<string, string>
  /**
   * Binary files: path -> ArrayBuffer content (transferred)
   */
  binaryFiles?: Record<string, ArrayBuffer>
}

export type FileSystemSyncMessage =
  | FSWriteMessage
  | FSUnlinkMessage
  | FSMkdirMessage
  | FSInitMessage

// Constants
export const V_FS_WRITE = 'V_FS_WRITE' as const
export const V_FS_UNLINK = 'V_FS_UNLINK' as const
export const V_FS_MKDIR = 'V_FS_MKDIR' as const
export const V_FS_INIT = 'V_FS_INIT' as const
