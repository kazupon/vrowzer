/**
 * HTML fallback Hono middleware
 * This middleware is ported from vite's htmlFallback middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/htmlFallback.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import fs from 'node:fs'
import path from 'node:path'
import { cleanUrl } from '../../../shared/utils'
import { createDebugger, joinUrlSegments } from '../../utils'
import { getRequestPath } from './utils'

import type { MiddlewareHandler } from 'hono'
import type { ViteEnv } from '../index'

const debug = createDebugger('vite:html-fallback')

export function htmlFallbackMiddleware(
  root: string,
  spaFallback: boolean,
  // NOTE(kazupon): vrowser does not use FullBundleDevEnvironment, so clientEnvironment is not needed
  // clientEnvironment?: DevEnvironment,
): MiddlewareHandler<ViteEnv> {
  // NOTE(kazupon): vrowser does not use FullBundleDevEnvironment memoryFiles
  // const memoryFiles =
  //   clientEnvironment instanceof FullBundleDevEnvironment
  //     ? clientEnvironment.memoryFiles
  //     : undefined

  function checkFileExists(relativePath: string) {
    return fs.existsSync(path.join(root, relativePath))
    // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
    // return (
    //   memoryFiles?.has(
    //     relativePath.slice(1), // remove first /
    //   ) ?? fs.existsSync(path.join(root, relativePath))
    // )
  }

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return async function viteHtmlFallbackMiddleware(c, next) {
    const method = c.req.method
    const requestPath = getRequestPath(c)

    if (
      // Only accept GET or HEAD
      (method !== 'GET' && method !== 'HEAD') ||
      // Exclude default favicon requests
      requestPath === '/favicon.ico' ||
      // Require Accept: text/html or */*
      !(
        c.req.header('accept') === undefined || // equivalent to `Accept: */*`
        c.req.header('accept') === '' || // equivalent to `Accept: */*`
        c.req.header('accept')?.includes('text/html') ||
        c.req.header('accept')?.includes('*/*')
      )
    ) {
      return next()
    }

    const url = cleanUrl(requestPath)
    let pathname
    try {
      pathname = decodeURIComponent(url)
    } catch {
      // ignore malformed URI
      return next()
    }

    // .html files are not handled by serveStaticMiddleware
    // so we need to check if the file exists
    if (pathname.endsWith('.html')) {
      if (checkFileExists(pathname)) {
        debug?.(`Rewriting ${method} ${requestPath} to ${url}`)
        c.set('rewrittenUrl', url)
        return next()
      }
    }
    // trailing slash should check for fallback index.html
    else if (pathname.endsWith('/')) {
      if (checkFileExists(joinUrlSegments(pathname, 'index.html'))) {
        const newUrl = url + 'index.html'
        debug?.(`Rewriting ${method} ${requestPath} to ${newUrl}`)
        c.set('rewrittenUrl', newUrl)
        return next()
      }
    }
    // non-trailing slash should check for fallback .html
    else {
      if (checkFileExists(pathname + '.html')) {
        const newUrl = url + '.html'
        debug?.(`Rewriting ${method} ${requestPath} to ${newUrl}`)
        c.set('rewrittenUrl', newUrl)
        return next()
      }
    }

    if (spaFallback) {
      debug?.(`Rewriting ${method} ${requestPath} to /index.html`)
      c.set('rewrittenUrl', '/index.html')
    }

    await next()
  }
}
// NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
// export function htmlFallbackMiddleware(
//   root: string,
//   spaFallback: boolean,
//   clientEnvironment?: DevEnvironment,
// ): Connect.NextHandleFunction {
//   const memoryFiles =
//     clientEnvironment instanceof FullBundleDevEnvironment
//       ? clientEnvironment.memoryFiles
//       : undefined
//
//   function checkFileExists(relativePath: string) {
//     return (
//       memoryFiles?.has(
//         relativePath.slice(1), // remove first /
//       ) ?? fs.existsSync(path.join(root, relativePath))
//     )
//   }
//
//   // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
//   return function viteHtmlFallbackMiddleware(req, _res, next) {
//     if (
//       // Only accept GET or HEAD
//       (req.method !== 'GET' && req.method !== 'HEAD') ||
//       // Exclude default favicon requests
//       req.url === '/favicon.ico' ||
//       // Require Accept: text/html or */*
//       !(
//         req.headers.accept === undefined || // equivalent to `Accept: */*`
//         req.headers.accept === '' || // equivalent to `Accept: */*`
//         req.headers.accept.includes('text/html') ||
//         req.headers.accept.includes('*/*')
//       )
//     ) {
//       return next()
//     }
//
//     const url = cleanUrl(req.url!)
//     let pathname
//     try {
//       pathname = decodeURIComponent(url)
//     } catch {
//       // ignore malformed URI
//       return next()
//     }
//
//     // .html files are not handled by serveStaticMiddleware
//     // so we need to check if the file exists
//     if (pathname.endsWith('.html')) {
//       if (checkFileExists(pathname)) {
//         debug?.(`Rewriting ${req.method} ${req.url} to ${url}`)
//         req.url = url
//         return next()
//       }
//     }
//     // trailing slash should check for fallback index.html
//     else if (pathname.endsWith('/')) {
//       if (checkFileExists(joinUrlSegments(pathname, 'index.html'))) {
//         const newUrl = url + 'index.html'
//         debug?.(`Rewriting ${req.method} ${req.url} to ${newUrl}`)
//         req.url = newUrl
//         return next()
//       }
//     }
//     // non-trailing slash should check for fallback .html
//     else {
//       if (checkFileExists(pathname + '.html')) {
//         const newUrl = url + '.html'
//         debug?.(`Rewriting ${req.method} ${req.url} to ${newUrl}`)
//         req.url = newUrl
//         return next()
//       }
//     }
//
//     if (spaFallback) {
//       debug?.(`Rewriting ${req.method} ${req.url} to /index.html`)
//       req.url = '/index.html'
//     }
//
//     next()
//   }
// }
