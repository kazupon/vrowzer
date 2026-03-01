/**
 * server middleware
 *
 * @module server
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createDebug } from 'obug'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { ResolvedVrowserOptions } from './options.ts'

const debug = createDebug('vite-plugin-vrowser:server')

/**
 * NOTE(kazupon):
 * Prevent Vite's SPA fallback from serving index.html for preview URL (e.g '/__preview__/') requests.
 * When service worker is not yet controlling the page (e.g. after hard reload),
 * preview requests bypass service worker and hit Vite directly.
 * Without this guard, Vite returns the main page HTML, causing recursive display.
 */
function previewGuardMiddleware(previewBase: string = '/__preview__') {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    debug('previewGuardMiddleware: previewBase ', previewBase, ' req.url ', req.url)

    if (req.url?.startsWith(previewBase)) {
      res.writeHead(503, {
        'Content-Type': 'text/html',
        'Retry-After': '1'
      })
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body>
<script>setTimeout(() => location.reload(), 1000)</script>
<p>Waiting for Service Worker...</p></body></html>`)
      return
    }

    next()
  }
}

export function serverMiddlewarePlugin(options: ResolvedVrowserOptions): Plugin {
  const middleware = previewGuardMiddleware(normalizeBasePath(options.basePath))
  return {
    name: 'vrowser:server-middleware',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    }
  }
}

function normalizeBasePath(basePath: string): string {
  debug('normalizeBasePath: basePath ', basePath)
  if (basePath.endsWith('/')) {
    return basePath.slice(0, -1)
  } else {
    return basePath
  }
}
