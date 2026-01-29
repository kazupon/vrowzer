/**
 * Transform middleware for Hono
 * This middleware is ported from vite's transform middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/transform.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import path from 'node:path'
import colors from 'picocolors'
import { NULL_BYTE_PLACEHOLDER } from '../../../shared/constants'
import { cleanUrl, unwrapId, withTrailingSlash } from '../../../shared/utils'
import { FS_PREFIX } from '../../constants'
import { isHTMLProxy } from '../../plugins/html'
import { fsPathFromId, injectQuery, isCSSRequest, isImportRequest, isJSRequest, normalizePath, removeImportQuery, removeTimestampQuery, urlRE } from '../../utils'
import { send } from '../send'
import { getRequestPath } from './utils'

import type { Context, MiddlewareHandler } from 'hono'
import type { ViteDevServer } from '..'
import type { ViteEnv } from '../index'

const knownIgnoreList = new Set(['/', '/favicon.ico'])

const documentFetchDests = new Set([
  'document',
  'iframe',
  'frame',
  'fencedframe',
])
function isDocumentFetchDest(c: Context<ViteEnv>) {
  const fetchDest = c.req.header('sec-fetch-dest')
  return fetchDest !== undefined && documentFetchDests.has(fetchDest)
}

export function transformMiddleware(
  server: ViteDevServer,
): MiddlewareHandler<ViteEnv> {
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`

  // check if public dir is inside root dir
  const { root, publicDir } = server.config
  // NOTE(kazupon): for future use
  // const publicDirInRoot = publicDir.startsWith(withTrailingSlash(root))
  // const publicPath = `${publicDir.slice(root.length)}/`
  const publicDirInRoot = (publicDir as string).startsWith(withTrailingSlash(root))
  const publicPath = `${(publicDir as string).slice(root.length)}/`

  return async function viteTransformMiddleware(c, next) {
    console.log('[transform] viteTransformMiddleware called for:', c.req.url)
    const environment = server.environments.client

    if (
      (c.req.method !== 'GET' && c.req.method !== 'HEAD') ||
      knownIgnoreList.has(getRequestPath(c)) ||
      isDocumentFetchDest(c)) {
      return next()
    }

    let url: string
    try {
      url = decodeURI(removeTimestampQuery(getRequestPath(c))).replace(
        NULL_BYTE_PLACEHOLDER,
        '\0',
      )
    } catch (e) {
      if (e instanceof URIError) {
        server.config.logger.warn(
          colors.yellow(
            `Malformed URI sequence in request URL: ${removeTimestampQuery(getRequestPath(c))}`,
          ),
        )
        return next()
      }
      throw e
    }

    const withoutQuery = cleanUrl(url)

    try {
      const isSourceMap = withoutQuery.endsWith('.map')
      // since we generate source map references, handle those requests here
      if (isSourceMap) {
        const depsOptimizer = environment.depsOptimizer
        if (depsOptimizer?.isOptimizedDepUrl(url)) {
          // If the browser is requesting a source map for an optimized dep, it
          // means that the dependency has already been pre-bundled and loaded
          const sourcemapPath = url.startsWith(FS_PREFIX)
            ? fsPathFromId(url)
            : normalizePath(path.resolve(server.config.root, url.slice(1)))

          // TODO(kazupon): implement later ...
        } else {
          const originalUrl = url.replace(/\.map($|\?)/, '$1')
          const map = {}
          // TODO(kazupon): implement later ...
          // const map = (
          //   await environment.moduleGraph.getModuleByUrl(originalUrl)
          // )?.transformResult?.map
          if (map) {
            return send(c, JSON.stringify(map), 'json', {
              // TODO(kazupon): fix type definition for ResolvedConfig.server
              headers: (server.config as { server?: { headers?: Record<string, string> } }).server?.headers,
            })
          } else {
            return next()
          }
        }
      }

      if (publicDirInRoot && url.startsWith(publicPath)) {
        warnAboutExplicitPublicPathInUrl(url)
      }

      if (c.req.header('sec-fetch-dest') === 'script' ||
        isJSRequest(url) ||
        isImportRequest(url) ||
        isCSSRequest(url) ||
        isHTMLProxy(url)
      ) {
        // strip ?import
        url = removeImportQuery(url)
        // Strip valid id prefix. This is prepended to resolved Ids that are
        // not valid browser import specifiers by the importAnalysis plugin.
        url = unwrapId(url)

        // for CSS, we differentiate between normal CSS requests and imports
        if (isCSSRequest(url)) {
          // TODO(kazupon): implement later ...

        }
      }
    } catch (e) {
      // TODO(kazupon): handle error
    }

    await next()
  }

  function warnAboutExplicitPublicPathInUrl(url: string) {
    let warning: string

    if (isImportRequest(url)) {
      const rawUrl = removeImportQuery(url)
      if (urlRE.test(url)) {
        warning =
          `Assets in the public directory are served at the root path.\n` +
          `Instead of ${colors.cyan(rawUrl)}, use ${colors.cyan(
            rawUrl.replace(publicPath, '/'),
          )}.`
      } else {
        warning =
          'Assets in public directory cannot be imported from JavaScript.\n' +
          `If you intend to import that asset, put the file in the src directory, and use ${colors.cyan(
            rawUrl.replace(publicPath, '/src/'),
          )} instead of ${colors.cyan(rawUrl)}.\n` +
          `If you intend to use the URL of that asset, use ${colors.cyan(
            injectQuery(rawUrl.replace(publicPath, '/'), 'url'),
          )}.`
      }
    } else {
      warning =
        `Files in the public directory are served at the root path.\n` +
        `Instead of ${colors.cyan(url)}, use ${colors.cyan(
          url.replace(publicPath, '/'),
        )}.`
    }

    server.config.logger.warn(colors.yellow(warning))
  }
}
