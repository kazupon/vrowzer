/**
 * Node.js `process` compatible entry point
 *
 * @module process
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import path from 'node:path'
// @ts-expect-error - aliased to 'process' package to avoid circular reference
import nativeProcess from 'native-process'

let _cwd = '/'

/**
 * Get the current working directory
 */
export function cwd(): string {
  return _cwd
}

/**
 * Change the current working directory
 *
 * @param directory - The directory to change to
 */
export function chdir(directory: string): void {
  if (directory.startsWith('/')) {
    _cwd = directory
  } else {
    _cwd = path.resolve(_cwd, directory)
  }
  // Remove trailing slash except for root
  if (_cwd !== '/' && _cwd.endsWith('/')) {
    _cwd = _cwd.slice(0, -1)
  }
}

/**
 * Reset the current working directory to '/'
 */
export function resetCwd(): void {
  _cwd = '/'
}

/**
 * Set the current working directory directly
 *
 * @param directory - The directory to set as the current working directory
 */
export function setCwd(directory: string): void {
  _cwd = directory
}

/**
 * Process object with custom cwd/chdir for virtual filesystem
 */
export const process: typeof import('process') = {
  ...nativeProcess,
  cwd,
  chdir
}

export default process
