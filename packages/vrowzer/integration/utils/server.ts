/**
 * Static server for E2E tests with COOP/COEP headers
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { getPort } from 'get-port-please'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

import type { Server } from 'node:http'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.map': 'application/json'
}

export interface StaticServer {
  url: string
  port: number
  close: () => Promise<void>
}

export async function createStaticServer(
  root: string,
  preferredPort?: number
): Promise<StaticServer> {
  const port = await getPort({ port: preferredPort ?? 3000 })

  // oxlint-disable-next-line typescript/no-misused-promises
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    let filePath = join(root, url.pathname)

    if (url.pathname.endsWith('/')) {
      filePath = join(filePath, 'index.html')
    }

    try {
      const content = await readFile(filePath)
      const ext = extname(filePath)
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

      // Required for SharedArrayBuffer (rolldown WASM runtime) and Service Worker
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
      res.setHeader('Service-Worker-Allowed', '/')
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

      res.writeHead(200)
      res.end(content)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        res.writeHead(404)
        res.end('Not Found')
      } else {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, () => resolve())
  })

  return {
    url: `http://localhost:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(err => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
  }
}
