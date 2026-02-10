import escapeHtml from 'escape-html'
import type { Context } from 'hono'
import { serveStatic } from 'hono/serve-static'
import type { MiddlewareHandler } from 'hono/types'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import {
  cleanUrl,
  isWindows,
  slash,
  withTrailingSlash,
} from '../../../shared/utils'
import type { ResolvedConfig } from '../../config'
import { FS_PREFIX } from '../../constants'
import type { ViteDevServer } from '../../server'
import {
  decodeURIIfPossible,
  fsPathFromUrl,
  isFileReadable,
  isImportRequest,
  isInternalRequest,
  isParentDirectory,
  isSameFilePath,
  normalizePath,
  removeLeadingSlash,
  urlRE,
} from '../../utils'
import type { ViteEnv } from '../index'
import { getRequestPath } from './utils'

const knownJavascriptExtensionRE = /\.(?:[tj]sx?|[cm][tj]s)$/
const ERR_DENIED_FILE = 'ERR_DENIED_FILE'

export function servePublicMiddleware(
  server: ViteDevServer,
  publicFiles?: Set<string>,
): MiddlewareHandler<ViteEnv> {
  const dir = server.config.publicDir
  const base = server.config.base

  const toFilePath = (url: string) => {
    let filePath = cleanUrl(url)
    if (filePath.indexOf('%') !== -1) {
      try {
        filePath = decodeURI(filePath)
      } catch {
        /* malform uri */
      }
    }
    return normalizePath(filePath)
  }

  // hono serveStatic
  const serve = serveStatic<ViteEnv>({
    root: '',
    rewriteRequestPath: (reqPath) => {
      let p = reqPath
      if (base !== '/' && p.startsWith(base)) {
        p = '/' + p.slice(base.length)
      }
      return path.join(dir, p)
    },
    getContent: async (filePath) => {
      try {
        const data = await fsp.readFile(filePath)
        return data.buffer as ArrayBuffer
      } catch {
        return null
      }
    },
    isDir: (filePath) => {
      try {
        return fs.statSync(filePath).isDirectory()
      } catch {
        return false
      }
    },
  })

  return async function viteServePublicMiddleware(c, next) {
    const requestPath = getRequestPath(c)

    // Reconstruct path with query string for import/url checks
    const fullUrl = c.req.url
    const queryIndex = fullUrl.indexOf('?')
    const search = queryIndex !== -1 ? fullUrl.slice(queryIndex) : ''
    const requestPathWithQuery = requestPath + search
    // To avoid the performance impact of `existsSync` on every request, we check against an
    // in-memory set of known public files. This set is updated on restarts.
    // also skip import request and internal requests `/@fs/ /@vite-client` etc...
    if (
      (publicFiles && !publicFiles.has(toFilePath(requestPath))) ||
      isImportRequest(requestPathWithQuery) ||
      isInternalRequest(requestPath) ||
      // for `/public-file.js?url` to be transformed
      urlRE.test(requestPathWithQuery)
    ) {
      return next()
    }

    // server.config.server.headers を適用
    const headers = server.config.server.headers
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        c.header(key, value as string)
      }
    }

    return serve(c, next)
  }
}

const jsMimes: Record<string, string> = {
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/javascript',
  tsx: 'text/javascript',
  mjs: 'text/javascript',
  mts: 'text/javascript',
  cjs: 'text/javascript',
  cts: 'text/javascript',
}

export function serveStaticMiddleware(
  server: ViteDevServer,
): MiddlewareHandler<ViteEnv> {
  const dir = server.config.root

  let currentFilePath = ''
  const serve = serveStatic<ViteEnv>({
    root: '',
    mimes: jsMimes,
    rewriteRequestPath: () => currentFilePath,
    getContent: async (filePath) => {
      try {
        const data = await fsp.readFile(filePath)
        return data.buffer as ArrayBuffer
      } catch {
        return null
      }
    },
    isDir: (filePath) => {
      try {
        return fs.statSync(filePath).isDirectory()
      } catch {
        return false
      }
    },
  })

  return async function viteServeStaticMiddleware(c, next) {
    const requestPath = getRequestPath(c)

    // only serve the file if it's not an html request or ends with `/`
    // so that html requests can fallthrough to our html middleware for
    // special processing
    // also skip internal requests `/@fs/ /@vite-client` etc...
    const cleanedUrl = cleanUrl(requestPath)
    if (
      cleanedUrl.endsWith('/') ||
      path.extname(cleanedUrl) === '.html' ||
      isInternalRequest(requestPath) ||
      // skip url starting with // as these will be interpreted as
      // scheme relative URLs by new URL() and will not be a valid file path
      requestPath.startsWith('//')
    ) {
      return next()
    }

    const pathname = decodeURIIfPossible(requestPath)
    if (pathname === undefined) return next()

    // apply aliases to static requests as well
    let redirectedPathname: string | undefined
    for (const { find, replacement } of server.config.resolve.alias) {
      const matches =
        typeof find === 'string'
          ? pathname.startsWith(find)
          : find.test(pathname)
      if (matches) {
        redirectedPathname = pathname.replace(find, replacement)
        break
      }
    }
    if (redirectedPathname) {
      // dir is pre-normalized to posix style
      if (redirectedPathname.startsWith(withTrailingSlash(dir))) {
        redirectedPathname = redirectedPathname.slice(dir.length)
      }
    }

    const resolvedPathname = redirectedPathname || pathname
    let fileUrl = path.resolve(dir, removeLeadingSlash(resolvedPathname))
    if (
      resolvedPathname.endsWith('/') &&
      fileUrl[fileUrl.length - 1] !== '/'
    ) {
      fileUrl = withTrailingSlash(fileUrl)
    }
    const access = checkLoadingAccess(server.config, fileUrl)
    if (access === 'denied') {
      return respondWithAccessDenied(fileUrl, server, c)
    }
    if (access === 'fallback') {
      return next()
    }

    const headers = server.config.server.headers
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        c.header(key, value as string)
      }
    }

    currentFilePath = fileUrl
    return serve(c, next)
  }
}

export function serveRawFsMiddleware(
  server: ViteDevServer,
): MiddlewareHandler<ViteEnv> {
  let currentFilePath = ''
  const serve = serveStatic<ViteEnv>({
    root: '',
    mimes: jsMimes,
    rewriteRequestPath: () => currentFilePath,
    getContent: async (filePath) => {
      try {
        const data = await fsp.readFile(filePath)
        return data.buffer as ArrayBuffer
      } catch {
        return null
      }
    },
    isDir: (filePath) => {
      try {
        return fs.statSync(filePath).isDirectory()
      } catch {
        return false
      }
    },
  })

  return async function viteServeRawFsMiddleware(c, next) {
    const requestPath = getRequestPath(c)

    // In some cases (e.g. linked monorepos) files outside of root will
    // reference assets that are also out of served root. In such cases
    // the paths are rewritten to `/@fs/` prefixed paths and must be served by
    // searching based from fs root.
    if (!requestPath.startsWith(FS_PREFIX)) {
      return next()
    }

    const pathname = decodeURIIfPossible(requestPath)
    if (pathname === undefined) return next()

    let newPathname = pathname.slice(FS_PREFIX.length)
    if (isWindows) newPathname = newPathname.replace(/^[A-Z]:/i, '')

    const filePath = '/' + newPathname

    const access = checkLoadingAccess(server.config, filePath)
    if (access === 'denied') {
      return respondWithAccessDenied(filePath, server, c)
    }
    if (access === 'fallback') {
      return next()
    }

    const headers = server.config.server.headers
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        c.header(key, value as string)
      }
    }

    currentFilePath = filePath
    return serve(c, next)
  }
}

/**
 * Check if the url is allowed to be served, via the `server.fs` config.
 * @deprecated Use the `isFileLoadingAllowed` function instead.
 */
export function isFileServingAllowed(
  config: ResolvedConfig,
  url: string,
): boolean
export function isFileServingAllowed(
  url: string,
  server: ViteDevServer,
): boolean
export function isFileServingAllowed(
  configOrUrl: ResolvedConfig | string,
  urlOrServer: string | ViteDevServer,
): boolean {
  const config = (
    typeof urlOrServer === 'string' ? configOrUrl : urlOrServer.config
  ) as ResolvedConfig
  const url = (
    typeof urlOrServer === 'string' ? urlOrServer : configOrUrl
  ) as string

  if (!config.server.fs.strict) return true
  const filePath = fsPathFromUrl(url)
  return isFileLoadingAllowed(config, filePath)
}

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param targetPath - normalized absolute path
 * @param filePath - normalized absolute path
 */
export function isFileInTargetPath(
  targetPath: string,
  filePath: string,
): boolean {
  return (
    isSameFilePath(targetPath, filePath) ||
    isParentDirectory(targetPath, filePath)
  )
}

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 */
export function isFileLoadingAllowed(
  config: ResolvedConfig,
  filePath: string,
): boolean {
  const { fs } = config.server

  if (!fs.strict) return true

  // NOTE: `fs.readFile('/foo.png/')` tries to load `'/foo.png'`
  // so we should check the path without trailing slash
  const filePathWithoutTrailingSlash = filePath.endsWith('/')
    ? filePath.slice(0, -1)
    : filePath
  if (config.fsDenyGlob(filePathWithoutTrailingSlash)) return false

  if (config.safeModulePaths.has(filePath)) return true

  if (fs.allow.some((uri) => isFileInTargetPath(uri, filePath))) return true

  return false
}

export function checkLoadingAccess(
  config: ResolvedConfig,
  path: string,
): 'allowed' | 'denied' | 'fallback' {
  if (isFileLoadingAllowed(config, slash(path))) {
    return 'allowed'
  }
  if (isFileReadable(path)) {
    return 'denied'
  }
  // if the file doesn't exist, we shouldn't restrict this path as it can
  // be an API call. Middlewares would issue a 404 if the file isn't handled
  return 'fallback'
}

export function respondWithAccessDenied(
  id: string,
  server: ViteDevServer,
  c: Context<ViteEnv>,
): Response {
  const urlMessage = `The request id "${id}" is outside of Vite serving allow list.`
  const hintMessage = `
${server.config.server.fs.allow.map((i) => `- ${i}`).join('\n')}

Refer to docs https://vite.dev/config/server-options.html#server-fs-allow for configurations and more details.`

  server.config.logger.error(urlMessage)
  server.config.logger.warnOnce(hintMessage + '\n')
  return c.html(renderRestrictedErrorHTML(urlMessage + '\n' + hintMessage), 403)
}

function renderRestrictedErrorHTML(msg: string): string {
  // to have syntax highlighting and autocompletion in IDE
  const html = String.raw
  return html`
    <body>
      <h1>403 Restricted</h1>
      <p>${escapeHtml(msg).replace(/\n/g, '<br/>')}</p>
      <style>
        body {
          padding: 1em 2em;
        }
      </style>
    </body>
  `
}
