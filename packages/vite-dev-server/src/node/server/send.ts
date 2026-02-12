/**
 * Send utility for Hono
 * This utility is ported from vite's send function.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/send.ts
 * - original license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import convertSourceMap from 'convert-source-map'
import MagicString from 'magic-string'
import path from 'node:path'
import { generateEtag } from '../../shared/utils'
import { createDebugger, removeTimestampQuery } from '../utils'
import { getRequestPath } from './middlewares/utils'
import { getCodeWithSourcemap } from './sourcemap'

import type { Context } from 'hono'
import type { SourceMap } from 'rolldown'
import type { ViteEnv } from './index'

const debug = createDebugger('vite:send', {
  onlyWhenFocused: true,
})

const alias: Record<string, string | undefined> = {
  js: 'text/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
}

export interface SendOptions {
  etag?: string | undefined
  cacheControl?: string | undefined
  headers?: Record<string, string> | undefined
  map?: SourceMap | { mappings: '' } | null | undefined
}

/**
 * Send a response with proper headers for Hono
 */
export function send(
  c: Context<ViteEnv>,
  content: string | Uint8Array,
  type: string,
  options: SendOptions = {},
): Response {
  const {
    etag = generateEtag(content, { weak: true }),
    cacheControl = 'no-cache',
    headers,
    map
  } = options

  // Check If-None-Match for 304 response
  const ifNoneMatch = c.req.header('if-none-match')
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 })
  }

  const contentType = alias[type] || type

  // Build response headers
  const responseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'Etag': etag,
  }

  // Add custom headers
  if (headers) {
    for (const name in headers) {
      const value = headers[name]
      if (value !== undefined) {
        responseHeaders[name] = value
      }
    }
  }

  // Helper to convert content to string
  const contentToString = (c: string | Uint8Array): string =>
    typeof c === 'string' ? c : new TextDecoder().decode(c)

  // inject source map reference
  if (map && 'version' in map && map.mappings) {
    if (type === 'js' || type === 'css') {
      content = getCodeWithSourcemap(type, contentToString(content), map)
    }
  }
  // inject fallback sourcemap for js for improved debugging
  // https://github.com/vitejs/vite/pull/13514#issuecomment-1592431496
  else if (type === 'js' && (!map || map.mappings !== '')) {
    const code = contentToString(content)
    // if the code has existing inline sourcemap, assume it's correct and skip
    if (convertSourceMap.mapFileCommentRegex.test(code)) {
      debug?.(`Skipped injecting fallback sourcemap for ${getRequestPath(c)}`)
    } else {
      const urlWithoutTimestamp = removeTimestampQuery(getRequestPath(c))
      const ms = new MagicString(code)
      content = getCodeWithSourcemap(
        type,
        code,
        ms.generateMap({
          source: path.basename(urlWithoutTimestamp),
          hires: 'boundary',
          includeContent: true,
        }) as SourceMap,
      )
    }
  }

  // Convert Uint8Array to string for Response compatibility
  const responseBody = contentToString(content)

  // Handle HEAD request
  if (c.req.method === 'HEAD') {
    return new Response(null, { status: 200, headers: responseHeaders })
  }

  return new Response(responseBody, { status: 200, headers: responseHeaders })
}
