/**
 * Browser-compatible filesystem using memfs.
 *
 * default export is fs instance
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// Re-export memfs core APIs
export { createFsFromVolume, fs, memfs, vol, Volume } from 'memfs'

export type { DirectoryJSON, IFs } from 'memfs'

// Import fs for individual API exports
import { fs } from 'memfs'

// Re-export fs constants and classes
export const constants = fs.constants
export const Stats = fs.Stats
export const Dirent = fs.Dirent
export const StatWatcher = fs.StatWatcher
export const FSWatcher = fs.FSWatcher
export const ReadStream = fs.ReadStream
export const WriteStream = fs.WriteStream

// Re-export synchronous methods
export const accessSync = fs.accessSync
export const appendFileSync = fs.appendFileSync
export const chmodSync = fs.chmodSync
export const chownSync = fs.chownSync
export const closeSync = fs.closeSync
export const copyFileSync = fs.copyFileSync
export const existsSync = fs.existsSync
export const fchmodSync = fs.fchmodSync
export const globSync = fs.globSync
export const fchownSync = fs.fchownSync
export const fdatasyncSync = fs.fdatasyncSync
export const fstatSync = fs.fstatSync
export const fsyncSync = fs.fsyncSync
export const ftruncateSync = fs.ftruncateSync
export const futimesSync = fs.futimesSync
export const lchmodSync = fs.lchmodSync
export const lchownSync = fs.lchownSync
export const linkSync = fs.linkSync
export const lstatSync = fs.lstatSync
export const mkdirSync = fs.mkdirSync
export const mkdtempSync = fs.mkdtempSync
export const openSync = fs.openSync
export const readdirSync = fs.readdirSync
export const readFileSync = fs.readFileSync
export const readlinkSync = fs.readlinkSync
export const readSync = fs.readSync
export const realpathSync = fs.realpathSync
export const renameSync = fs.renameSync
export const rmdirSync = fs.rmdirSync
export const rmSync = fs.rmSync
export const statSync = fs.statSync
export const symlinkSync = fs.symlinkSync
export const truncateSync = fs.truncateSync
export const unlinkSync = fs.unlinkSync
export const utimesSync = fs.utimesSync
export const writeFileSync = fs.writeFileSync
export const writeSync = fs.writeSync

// Re-export asynchronous (callback-based) methods
export const access = fs.access
export const appendFile = fs.appendFile
export const chmod = fs.chmod
export const chown = fs.chown
export const close = fs.close
export const copyFile = fs.copyFile
export const exists = fs.exists
export const fchmod = fs.fchmod
export const fchown = fs.fchown
export const fdatasync = fs.fdatasync
export const fstat = fs.fstat
export const fsync = fs.fsync
export const glob = fs.glob
export const ftruncate = fs.ftruncate
export const futimes = fs.futimes
export const lchmod = fs.lchmod
export const lchown = fs.lchown
export const link = fs.link
export const lstat = fs.lstat
export const mkdir = fs.mkdir
export const mkdtemp = fs.mkdtemp
export const open = fs.open
export const readdir = fs.readdir
export const readFile = fs.readFile
export const readlink = fs.readlink
export const read = fs.read
export const realpath = fs.realpath
export const rename = fs.rename
export const rmdir = fs.rmdir
export const rm = fs.rm
export const stat = fs.stat
export const symlink = fs.symlink
export const truncate = fs.truncate
export const unlink = fs.unlink
export const utimes = fs.utimes
export const writeFile = fs.writeFile
export const write = fs.write

// Re-export stream methods
export const createReadStream = fs.createReadStream
export const createWriteStream = fs.createWriteStream

// Re-export watch methods
export const watch = fs.watch
export const watchFile = fs.watchFile
export const unwatchFile = fs.unwatchFile

// Re-export promises API
export const promises = fs.promises

// Re-export custom process utilities
export { chdir, cwd, process, resetCwd, setCwd } from './polyfills/process'

// Default export
export default fs
