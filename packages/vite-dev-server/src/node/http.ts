// TODO: ...

import type { OutgoingHttpHeaders as HttpServerHeaders } from 'node:http'
import type { ServerOptions as HttpsServerOptions } from 'node:https'

// TODO: ...

export interface CommonServerOptions {
  /**
   * Specify server port. Note if the port is already being used, Vite will
   * automatically try the next available port so this may not be the actual
   * port the server ends up listening on.
   */
  port?: number
  /**
   * If enabled, vite will exit if specified port is already in use
   */
  strictPort?: boolean
  /**
   * Specify which IP addresses the server should listen on.
   * Set to 0.0.0.0 to listen on all addresses, including LAN and public addresses.
   */
  host?: string | boolean
  /**
   * The hostnames that Vite is allowed to respond to.
   * `localhost` and subdomains under `.localhost` and all IP addresses are allowed by default.
   * When using HTTPS, this check is skipped.
   *
   * If a string starts with `.`, it will allow that hostname without the `.` and all subdomains under the hostname.
   * For example, `.example.com` will allow `example.com`, `foo.example.com`, and `foo.bar.example.com`.
   *
   * If set to `true`, the server is allowed to respond to requests for any hosts.
   * This is not recommended as it will be vulnerable to DNS rebinding attacks.
   */
  allowedHosts?: string[] | true
  /**
   * Enable TLS + HTTP/2.
   * Note: this downgrades to TLS only when the proxy option is also used.
   */
  https?: HttpsServerOptions
  /**
   * Open browser window on startup
   */
  open?: boolean | string
  /**
   * Configure custom proxy rules for the dev server. Expects an object
   * of `{ key: options }` pairs.
   * Uses [`http-proxy-3`](https://github.com/sagemathinc/http-proxy-3).
   * Full options [here](https://github.com/sagemathinc/http-proxy-3#options).
   *
   * Example `vite.config.js`:
   * ``` js
   * module.exports = {
   *   proxy: {
   *     // string shorthand: /foo -> http://localhost:4567/foo
   *     '/foo': 'http://localhost:4567',
   *     // with options
   *     '/api': {
   *       target: 'http://jsonplaceholder.typicode.com',
   *       changeOrigin: true,
   *       rewrite: path => path.replace(/^\/api/, '')
   *     }
   *   }
   * }
   * ```
   */
  // TODO: define ProxyOptions type, later
  // proxy?: Record<string, string | ProxyOptions>
  /**
   * Configure CORS for the dev server.
   * Uses https://github.com/expressjs/cors.
   *
   * When enabling this option, **we recommend setting a specific value
   * rather than `true`** to avoid exposing the source code to untrusted origins.
   *
   * Set to `true` to allow all methods from any origin, or configure separately
   * using an object.
   *
   * @default false
   */
  cors?: CorsOptions | boolean
  /**
   * Specify server response headers.
   */
  headers?: HttpServerHeaders
}

/**
 * https://github.com/expressjs/cors#configuration-options
 */
export interface CorsOptions {
  /**
   * Configures the Access-Control-Allow-Origin CORS header.
   *
   * **We recommend setting a specific value rather than
   * `true`** to avoid exposing the source code to untrusted origins.
   */
  origin?:
    | CorsOrigin
    | ((
        origin: string | undefined,
        cb: (err: Error, origins: CorsOrigin) => void,
      ) => void)
  methods?: string | string[]
  allowedHeaders?: string | string[]
  exposedHeaders?: string | string[]
  credentials?: boolean
  maxAge?: number
  preflightContinue?: boolean
  optionsSuccessStatus?: number
}

export type CorsOrigin = boolean | string | RegExp | (string | RegExp)[]


// TODO: ...
