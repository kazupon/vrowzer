/**
 * Transform Hono middleware
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

import colors from 'picocolors'
import { ERR_OUTDATED_OPTIMIZED_DEP, NULL_BYTE_PLACEHOLDER } from '../../../shared/constants'
import { cleanUrl, unwrapId, withTrailingSlash } from '../../../shared/utils'
import { DEP_VERSION_RE, ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR, ERR_OPTIMIZE_DEPS_PROCESSING_ERROR } from '../../constants'
import { isDirectCSSRequest } from '../../plugins/css'
import { isHTMLProxy } from '../../plugins/html'
import { createDebugger, injectQuery, isCSSRequest, isImportRequest, isJSRequest, removeImportQuery, removeTimestampQuery } from '../../utils'
import { ERR_CLOSED_SERVER } from '../pluginContainer'
import { send } from '../send'
import { ERR_DENIED_ID, ERR_LOAD_URL } from '../transformRequest'
import { checkLoadingAccess, respondWithAccessDenied } from './static'
import { getRequestPath } from './utils'

import type { Context, MiddlewareHandler } from 'hono'
import type { ViteDevServer } from '..'
import type { ResolvedConfig } from '../../config'
import type { ViteEnv } from '../index'

const debugCache = createDebugger('vite:cache')

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

// TODO: consolidate this regex pattern with the url, raw, and inline checks in plugins
const urlRE = /[?&]url\b/
const rawRE = /[?&]raw\b/
const inlineRE = /[?&]inline\b/
const svgRE = /\.svg\b/

export function isServerAccessDeniedForTransform(config: ResolvedConfig, id: string) {
  if (rawRE.test(id) || urlRE.test(id) || inlineRE.test(id) || svgRE.test(id)) {
    return checkLoadingAccess(config, id) !== 'allowed'
  }
  return false
}

// TODO: fill in later ...

export function transformMiddleware(
  server: ViteDevServer,
): MiddlewareHandler<ViteEnv> {
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`

  // check if public dir is inside root dir
  const { root, publicDir } = server.config
  const publicDirInRoot = publicDir.startsWith(withTrailingSlash(root))
  const publicPath = `${publicDir.slice(root.length)}/`

  return async function viteTransformMiddleware(c, next) {
    console.log('[transform] viteTransformMiddleware called for:', c.req.url, getRequestPath(c))

    // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
    // const environment = server.environments.client

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
        return next()
        // NOTE(kazupon): implement later ...
        // const depsOptimizer = environment.depsOptimizer
        // if (depsOptimizer?.isOptimizedDepUrl(url)) {
        //   // If the browser is requesting a source map for an optimized dep, it
        //   // means that the dependency has already been pre-bundled and loaded
        //   const sourcemapPath = url.startsWith(FS_PREFIX)
        //     ? fsPathFromId(url)
        //     : normalizePath(path.resolve(server.config.root, url.slice(1)))

        //   // TODO(kazupon): implement later ...
        // } else {
        //   const originalUrl = url.replace(/\.map($|\?)/, '$1')
        //   const map = (
        //     await environment.moduleGraph.getModuleByUrl(originalUrl)
        //   )?.transformResult?.map
        //   if (map) {
        //     return send(c, JSON.stringify(map), 'json', {
        //       headers: server.config.server.headers as Record<string, string>,
        //     })
        //   } else {
        //     return next()
        //   }
        // }
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

        // resolve, load and transform using the plugin container
        const result = await server.transformRequest(url)
        // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
        // const result = await environment.transformRequest(url, {
        //   allowId(id) {
        //     return (
        //       id[0] === '\0' ||
        //       !isServerAccessDeniedForTransform(server.config, id)
        //     )
        //   },
        // })
        if (result) {
          // TODO(kazupon): disable optimizer, because we don't still implement it.
          // const depsOptimizer = environment.depsOptimizer
          const type = isDirectCSSRequest(url) ? 'css' : 'js'
          const isDep = DEP_VERSION_RE.test(url)
          // TODO(kazupon): disable optimizer, because we don't still implement it.
          // const isDep =
          //   DEP_VERSION_RE.test(url) || depsOptimizer?.isOptimizedDepUrl(url)
          return send(c, result.code, type, {
            etag: result.etag,
            // allow browser to cache npm deps!
            cacheControl: isDep ? 'max-age=31536000,immutable' : 'no-cache',
            headers: server.config.server.headers as Record<string, string>,
            map: result.map,
          })
          // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
          // return send(req, res, result.code, type, {
          //   etag: result.etag,
          //   // allow browser to cache npm deps!
          //   cacheControl: isDep ? 'max-age=31536000,immutable' : 'no-cache',
          //   headers: server.config.server.headers,
          //   map: result.map,
          // })
        }
      }
    } catch (e) {
      if (e?.code === ERR_OPTIMIZE_DEPS_PROCESSING_ERROR) {
        // This timeout is unexpected
        server.config.logger.error(e.message)
        return c.body(null, 504)
      }
      if (e?.code === ERR_OUTDATED_OPTIMIZED_DEP) {
        // We don't need to log an error in this case, the request
        // is outdated because new dependencies were discovered and
        // the new pre-bundle dependencies have changed.
        // A full-page reload has been issued, and these old requests
        // can't be properly fulfilled. This isn't an unexpected
        // error but a normal part of the missing deps discovery flow
        return c.body(null, 504)
      }
      if (e?.code === ERR_CLOSED_SERVER) {
        //if (e?.code === ERR_CLOSED_SERVER) {
        // We don't need to log an error in this case, the request
        // is outdated because new dependencies were discovered and
        // the new pre-bundle dependencies have changed.
        // A full-page reload has been issued, and these old requests
        // can't be properly fulfilled. This isn't an unexpected
        // error but a normal part of the missing deps discovery flow
        return c.body(null, 504)
      }
      if (e?.code === ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR) {
        server.config.logger.warn(colors.yellow(e.message))
        return c.body(null, 404)
      }
      if (e?.code === ERR_LOAD_URL) {
        // Let other middleware handle if we can't load the url via transformRequest
        return next()
      }
      if (e?.code === ERR_DENIED_ID) {
        const id: string = e.id
        const servingAccessResult = checkLoadingAccess(server.config, id)
        if (servingAccessResult === 'denied') {
          return respondWithAccessDenied(id, server, c)
        }
        if (servingAccessResult === 'fallback') {
          return next()
        }
        servingAccessResult satisfies 'allowed'
        throw new Error(`Unexpected access result for id ${id}`)
      }
      throw e

      // NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
      // if (e?.code === ERR_OPTIMIZE_DEPS_PROCESSING_ERROR) {
      //   // Skip if response has already been sent
      //   if (!res.writableEnded) {
      //     res.statusCode = 504 // status code request timeout
      //     res.statusMessage = 'Optimize Deps Processing Error'
      //     res.end()
      //   }
      //   // This timeout is unexpected
      //   server.config.logger.error(e.message)
      //   return
      // }
      // if (e?.code === ERR_OUTDATED_OPTIMIZED_DEP) {
      //   // Skip if response has already been sent
      //   if (!res.writableEnded) {
      //     res.statusCode = 504 // status code request timeout
      //     res.statusMessage = 'Outdated Optimize Dep'
      //     res.end()
      //   }
      //   // We don't need to log an error in this case, the request
      //   // is outdated because new dependencies were discovered and
      //   // the new pre-bundle dependencies have changed.
      //   // A full-page reload has been issued, and these old requests
      //   // can't be properly fulfilled. This isn't an unexpected
      //   // error but a normal part of the missing deps discovery flow
      //   return
      // }
      // if (e?.code === ERR_CLOSED_SERVER) {
      //   // Skip if response has already been sent
      //   if (!res.writableEnded) {
      //     res.statusCode = 504 // status code request timeout
      //     res.statusMessage = 'Outdated Request'
      //     res.end()
      //   }
      //   // We don't need to log an error in this case, the request
      //   // is outdated because new dependencies were discovered and
      //   // the new pre-bundle dependencies have changed.
      //   // A full-page reload has been issued, and these old requests
      //   // can't be properly fulfilled. This isn't an unexpected
      //   // error but a normal part of the missing deps discovery flow
      //   return
      // }
      // if (e?.code === ERR_FILE_NOT_FOUND_IN_OPTIMIZED_DEP_DIR) {
      //   // Skip if response has already been sent
      //   if (!res.writableEnded) {
      //     res.statusCode = 404
      //     res.end()
      //   }
      //   server.config.logger.warn(colors.yellow(e.message))
      //   return
      // }
      // if (e?.code === ERR_LOAD_URL) {
      //   // Let other middleware handle if we can't load the url via transformRequest
      //   return next()
      // }
      // if (e?.code === ERR_DENIED_ID) {
      //   const id: string = e.id
      //   const servingAccessResult = checkLoadingAccess(server.config, id)
      //   if (servingAccessResult === 'denied') {
      //     respondWithAccessDenied(id, server, res)
      //     return true
      //   }
      //   if (servingAccessResult === 'fallback') {
      //     next()
      //     return true
      //   }
      //   servingAccessResult satisfies 'allowed'
      //   throw new Error(`Unexpected access result for id ${id}`)
      // }
      // return next(e)
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
