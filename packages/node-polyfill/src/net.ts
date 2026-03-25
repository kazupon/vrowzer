/**
 * `node:net` stub for browser/Worker environments.
 *
 * Provides minimal no-op exports so that modules importing `node:net`
 * can load without errors. Network socket APIs are not available in browsers.
 *
 * @module net
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export function createServer() {
  throw new Error('[vrowzer] node:net createServer is not supported in browser/Worker environment')
}

export function createConnection() {
  throw new Error(
    '[vrowzer] node:net createConnection is not supported in browser/Worker environment'
  )
}

export const connect = createConnection

export function isIP(_input: string): number {
  return 0
}

export function isIPv4(_input: string): boolean {
  return false
}

export function isIPv6(_input: string): boolean {
  return false
}

export class Socket {
  constructor() {
    throw new Error('[vrowzer] node:net Socket is not supported in browser/Worker environment')
  }
}

export class Server {
  constructor() {
    throw new Error('[vrowzer] node:net Server is not supported in browser/Worker environment')
  }
}

export default {
  createServer,
  createConnection,
  connect,
  isIP,
  isIPv4,
  isIPv6,
  Socket,
  Server
}
