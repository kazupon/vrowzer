/**
 * This entry file is for service worker server
 *
 * @module service-worker-server
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { EventEmitter } from 'events'

import type { EventEmitterOptions } from 'events'
import type { AddressInfo, ListenOptions } from 'node:net'
import type { SvcWorker } from '@vrowser/service-worker/worker'

/**
 * The {@link SvcWorkerServer} constructor options
 */
export interface SvcWorkerServerOptions extends EventEmitterOptions {
  /**
   * The Service Worker instance
   */
  serviceWorker: SvcWorker
}

/**
 * Service Worker Server
 *
 * This class have like Node.js HTTP Server interfaces.
 *
 * This class will be used as server that runs within a Service Worker environment.
 */
export class SvcWorkerServer extends EventEmitter implements Disposable, AsyncDisposable {
  #serviceWorker: SvcWorker

  constructor(serviceWorker: SvcWorker, options?: EventEmitterOptions) {
    super(options)
    this.#serviceWorker = serviceWorker
  }

  // ----- net.Server methods -----

  /**
   * Start a server listening for connections.
   */
  listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this
  listen(port?: number, hostname?: string, listeningListener?: () => void): this
  listen(port?: number, backlog?: number, listeningListener?: () => void): this
  listen(port?: number, listeningListener?: () => void): this
  listen(path: string, backlog?: number, listeningListener?: () => void): this
  listen(path: string, listeningListener?: () => void): this
  listen(options: ListenOptions, listeningListener?: () => void): this
  listen(handle: unknown, backlog?: number, listeningListener?: () => void): this
  listen(handle: unknown, listeningListener?: () => void): this
  listen(..._args: unknown[]): this {
    // TODO: implement
    return this
  }

  /**
   * Stops the server from accepting new connections and keeps existing connections.
   */
  close(callback?: (err?: Error) => void): this {
    // TODO: implement
    if (callback) {
      callback()
    }
    return this
  }

  /**
   * Returns the bound `address`, the address `family` name, and `port` of the server.
   */
  address(): AddressInfo | string | null {
    // TODO: implement
    return null
  }

  /**
   * Asynchronously get the number of concurrent connections on the server.
   */
  getConnections(cb: (error: Error | null, count: number) => void): this {
    // TODO: implement
    cb(null, 0)
    return this
  }

  // ----- http.Server methods -----

  /**
   * Sets the timeout value for sockets, and emits a `'timeout'` event on
   * the Server object, passing the socket as an argument, if a timeout occurs.
   */
  setTimeout(msecs?: number, callback?: () => void): this
  setTimeout(callback: () => void): this
  setTimeout(_msecsOrCallback?: number | (() => void), _callback?: () => void): this {
    // TODO: implement
    return this
  }

  /**
   * Closes all connections connected to this server.
   */
  closeAllConnections(): void {
    // TODO: implement
  }

  /**
   * Closes all connections connected to this server which are not sending a request
   * or waiting for a response.
   */
  closeIdleConnections(): void {
    // TODO: implement
  }

  [Symbol.dispose](): void {
    this.close()
  }

  /**
   * Calls close() and returns a promise that fulfills when the server has closed.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    return new Promise((resolve, reject) => {
      this.close(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
