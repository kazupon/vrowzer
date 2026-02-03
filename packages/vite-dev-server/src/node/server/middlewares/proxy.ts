// TODO: fill in later ...

export interface ProxyOptions {
}

// NOTE(kazupon): commented out, because we need to know about background later
// export interface ProxyOptions extends httpProxy.ServerOptions {
//   /**
//    * rewrite path
//    */
//   rewrite?: (path: string) => string
//   /**
//    * configure the proxy server (e.g. listen to events)
//    */
//   configure?: (proxy: httpProxy.ProxyServer, options: ProxyOptions) => void
//   /**
//    * webpack-dev-server style bypass function
//    */
//   bypass?: (
//     req: http.IncomingMessage,
//     /** undefined for WebSocket upgrade requests */
//     res: http.ServerResponse | undefined,
//     options: ProxyOptions,
//   ) =>
//     | void
//     | null
//     | undefined
//     | false
//     | string
//     | Promise<void | null | undefined | boolean | string>
//   /**
//    * rewrite the Origin header of a WebSocket request to match the target
//    *
//    * **Exercise caution as rewriting the Origin can leave the proxying open to [CSRF attacks](https://owasp.org/www-community/attacks/csrf).**
//    */
//   rewriteWsOrigin?: boolean | undefined
// }

// TODO: fill in later ...
