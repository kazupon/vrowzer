/**
 * index.html Hono middleware
 * This middleware is ported from vite's indexHtml middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/indexHtml.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { cleanUrl } from '../../../shared/utils'
import { FS_PREFIX } from '../../constants'
import {
  fsPathFromId,
  isDevServer,
  isParentDirectory,
  normalizePath,
} from '../../utils'
import { send } from '../send'
import { checkLoadingAccess, respondWithAccessDenied } from './static'
import { getRequestPath } from './utils'

import type { MiddlewareHandler } from 'hono'
import type { PreviewServer, ViteDevServer } from '../..'
import type { ViteEnv } from '../index'

// TODO: fill in later ...

export function indexHtmlMiddleware(
  root: string,
  server: ViteDevServer | PreviewServer,
): MiddlewareHandler<ViteEnv> {
  const isDev = isDevServer(server)
  const fullBundleEnv = undefined
  // NOTE(kazupon): comment out, because fullBundleEnv is not supported in vrowser yet
  // const fullBundleEnv =
  //   isDev && server.environments.client instanceof FullBundleDevEnvironment
  //     ? server.environments.client
  //     : undefined

  return async function viteIndexHtmlMiddleware(c, next) {
    const requestPath = getRequestPath(c)
    const url = cleanUrl(requestPath)
    // htmlFallbackMiddleware appends '.html' to URLs
    if (url.endsWith('.html') && c.req.header('sec-fetch-dest') !== 'script') {
      if (fullBundleEnv) {
        // TODO(kazupon): Implement the logic to serve index.html from fullBundleEnv later ...
        // ...
      }

      let filePath: string
      if (isDev && url.startsWith(FS_PREFIX)) {
        filePath = decodeURIComponent(fsPathFromId(url))
      } else {
        filePath = normalizePath(
          path.resolve(path.join(root, decodeURIComponent(url))),
        )
      }

      if (isDev) {
        const servingAccessResult = checkLoadingAccess(server.config, filePath)
        if (servingAccessResult === 'denied') {
          return respondWithAccessDenied(filePath, server as ViteDevServer, c)
        }
        if (servingAccessResult === 'fallback') {
          return next()
        }
        servingAccessResult satisfies 'allowed'
      } else {
        // `server.fs` options does not apply to the preview server.
        // But we should disallow serving files outside the output directory.
        if (!isParentDirectory(root, filePath)) {
          return next()
        }
      }

      if (fs.existsSync(filePath)) {
        const headers = isDev
          ? server.config.server.headers
          : server.config.preview.headers

        try {
          let html = await fsp.readFile(filePath, 'utf-8')
          if (isDev) {
            // c.req.path is the original request path before base stripping,
            // equivalent to Connect's req.originalUrl
            html = await server.transformIndexHtml(url, html, c.req.path)
          }
          return send(c, html, 'html', {
            headers: headers as Record<string, string>,
          })
        } catch {
          throw new Error(`Failed to load index.html: ${filePath}`)
        }
      }
    }

    await next()
  }
}
