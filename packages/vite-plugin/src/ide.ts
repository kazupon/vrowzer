/**
 * Browser IDE plugin for Vrowser.
 *
 * When `experimental.ide` is enabled, serves a pre-built browser IDE at `/__vrowser__/`.
 * The IDE is a self-contained Vue app with Monaco Editor, File Explorer, and Preview,
 * bundled into dist/ide/ at build time.
 *
 * Phase 3: birpc WebSocket for file sync (write-back to local FS).
 *
 * @module ide
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBirpc } from 'birpc'
import { createDebug } from 'obug'
import { WebSocketServer } from 'ws'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import type { WebSocket } from 'ws'
import type { ResolvedVrowserOptions } from './options.ts'
import type { ClientFunctions, ServerFunctions } from './ide/rpc.ts'

const debug = createDebug('vite-plugin-vrowser:ide')

const IDE_BASE = '/__vrowser__'
const IDE_CLIENT_PATH = `${IDE_BASE}/client.js`

// Resolve path to dist/ide/ directory (pre-built IDE assets)
const __dir = dirname(fileURLToPath(import.meta.url))
const ideDistDir = resolve(__dir, __dir.endsWith('/dist') ? 'ide' : '../dist/ide')

const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

function generateIdeClientCode(basePath: string, rpcPort: number): string {
  return `
import { Vrowser } from 'vrowser'
import manifest from 'virtual:vrowser-manifest'

// mountIde is loaded via script tag in HTML and exposed as global
window.__vrowser_ide_mount__({
  manifest,
  basePath: '${basePath}',
  Vrowser,
  rpcPort: ${rpcPort}
})
`
}

function generateIdeHtml(base: string, cssFile: string | null): string {
  const cssLink = cssFile
    ? `<link rel="stylesheet" href="${base}${IDE_BASE.slice(1)}/dist/${cssFile}" />`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vrowser IDE</title>
  ${cssLink}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #app { height: 100%; }
    body { font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${base}${IDE_BASE.slice(1)}/dist/ide.js"></script>
  <script type="module" src="${base}${IDE_BASE.slice(1)}/client.js"></script>
</body>
</html>`
}

function findAvailablePort(preferredPort?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const { createServer } = require('node:net') as typeof import('node:net')
    const server = createServer()
    const port = preferredPort ?? 7900
    server.listen(port, () => {
      server.close(() => resolve(port))
    })
    server.on('error', () => {
      // Port in use, try next
      server.close()
      const next = createServer()
      next.listen(0, () => {
        const addr = next.address()
        const p = typeof addr === 'object' && addr ? addr.port : 0
        next.close(() => resolve(p))
      })
      next.on('error', reject)
    })
  })
}

export function idePlugin(options: ResolvedVrowserOptions): Plugin {
  let viteBase = '/'
  let ideCssFile: string | null = null
  let rpcPort = 0
  let projectRoot = ''
  let sourceDir = ''

  // Find the CSS file in dist/ide/
  if (existsSync(ideDistDir)) {
    try {
      const files = readdirSync(ideDistDir)
      ideCssFile = files.find(f => f.endsWith('.css')) ?? null
    } catch {
      // ignore
    }
  }

  return {
    name: 'vrowser:ide',
    apply: 'serve',
    async configResolved(config) {
      viteBase = config.base || '/'
      projectRoot = config.root
      sourceDir = options.manifest?.sourceDir
        ? resolve(projectRoot, options.manifest.sourceDir)
        : projectRoot

      // Find available port for birpc WebSocket
      rpcPort = await findAvailablePort(options.ide.port)
      debug('RPC port:', rpcPort)
    },
    resolveId(id) {
      if (id === IDE_CLIENT_PATH) {
        return id
      }
    },
    load(id) {
      if (id === IDE_CLIENT_PATH) {
        return generateIdeClientCode(options.basePath, rpcPort)
      }
    },
    configureServer(server: ViteDevServer) {
      const ideUrl = `${IDE_BASE}/`

      // --- birpc WebSocket server ---
      const wss = new WebSocketServer({ port: rpcPort })
      debug('birpc WebSocket server listening on port', rpcPort)

      wss.on('connection', (ws: WebSocket) => {
        debug('IDE client connected')

        const rpc = createBirpc<ClientFunctions, ServerFunctions>(
          {
            async writeFile(path: string, content: string) {
              const absPath = resolve(sourceDir, path.startsWith('/') ? path.slice(1) : path)
              debug('writeFile:', absPath)
              writeFileSync(absPath, content, 'utf-8')
            }
          },
          {
            post: data => ws.send(data),
            on: handler => ws.on('message', handler),
            serialize: v => JSON.stringify(v),
            deserialize: v => JSON.parse(String(v))
          }
        )

        // Watch for file changes from external editors (chokidar via Vite's watcher)
        const watcher = server.watcher
        const onFileChange = (filePath: string) => {
          // Only notify for source files within sourceDir, not node_modules
          if (filePath.startsWith(sourceDir) && !filePath.includes('node_modules')) {
            const relPath = '/' + filePath.slice(sourceDir.length + 1).replace(/\\/g, '/')
            try {
              const content = readFileSync(filePath, 'utf-8')
              debug('external file change:', relPath)
              rpc.onFileChanged(relPath, content)
            } catch {
              // file might have been deleted
            }
          }
        }

        watcher.on('change', onFileChange)

        ws.on('close', () => {
          debug('IDE client disconnected')
          watcher.off('change', onFileChange)
        })
      })

      // Clean up WebSocket server when Vite server closes
      server.httpServer?.on('close', () => {
        wss.close()
        debug('birpc WebSocket server closed')
      })

      // Print IDE URL after server start
      server.httpServer?.once('listening', () => {
        const info = server.config.server
        const protocol = info.https ? 'https' : 'http'
        const host = typeof info.host === 'string' ? info.host : 'localhost'
        const port = info.port || 5173
        setTimeout(() => {
          server.config.logger.info(
            `  \x1b[36m➜\x1b[0m  \x1b[1mVrowser IDE\x1b[0m: \x1b[36m${protocol}://${host}:${port}${ideUrl}\x1b[0m`
          )
        }, 100)
      })

      // Serve IDE at /__vrowser__/
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? ''

        // Serve IDE HTML
        if (url === IDE_BASE || url === ideUrl) {
          debug('serving IDE HTML')
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless'
          })
          res.end(generateIdeHtml(viteBase, ideCssFile))
          return
        }

        // Serve IDE static assets from dist/ide/
        if (url.startsWith(`${IDE_BASE}/dist/`)) {
          const assetName = url.slice(`${IDE_BASE}/dist/`.length)
          const assetPath = join(ideDistDir, assetName)

          if (existsSync(assetPath)) {
            const ext = extname(assetName)
            const mime = MIME_TYPES[ext] || 'application/octet-stream'
            debug('serving IDE asset:', assetName)
            res.writeHead(200, {
              'Content-Type': mime,
              'Cross-Origin-Opener-Policy': 'same-origin',
              'Cross-Origin-Embedder-Policy': 'credentialless',
              'Cache-Control': 'no-cache'
            })
            res.end(readFileSync(assetPath))
            return
          }
        }

        next()
      })
    }
  }
}
