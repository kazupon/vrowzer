/**
 * Error Hono middleware
 * This middleware is ported from vite's error middleware.
 */

/**
 * Forked from Vite
 * - repository: https://github.com/vitejs/vite
 * - file: packages/vite/src/node/server/middlewares/error.ts
 * - origninal license: MIT
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { ErrorPayload } from '#types/hmrPayload'
import type { ErrorHandler } from 'hono'
import path from 'node:path'
import colors from 'picocolors'
import type { RollupError } from 'rolldown'
import { CLIENT_PUBLIC_PATH } from '../../constants'
import { pad } from '../../utils'
import type { ViteDevServer, ViteEnv } from '../index'

// oxlint-disable-next-line no-control-regex
const ansiRegex = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g

function strip(str: string): string {
  return str.replace(ansiRegex, '')
}

export function prepareError(err: Error | RollupError): ErrorPayload['err'] {
  // only copy the information we need and avoid serializing unnecessary
  // properties, since some errors may attach full objects (e.g. PostCSS)
  return {
    message: strip(err.message),
    stack: strip(cleanStack(err.stack || '')),
    id: (err as RollupError).id,
    frame: strip((err as RollupError).frame || ''),
    plugin: (err as RollupError).plugin,
    pluginCode: (err as RollupError).pluginCode?.toString(),
    loc: (err as RollupError).loc,
  }
}

export function buildErrorMessage(
  err: RollupError,
  args: string[] = [],
  includeStack = true,
): string {
  if (err.plugin) {args.push(`  Plugin: ${colors.magenta(err.plugin)}`)}
  const loc = err.loc ? `:${err.loc.line}:${err.loc.column}` : ''
  if (err.id) {args.push(`  File: ${colors.cyan(err.id)}${loc}`)}
  if (err.frame) {args.push(colors.yellow(pad(err.frame)))}
  if (includeStack && err.stack) {args.push(pad(cleanStack(err.stack)))}
  return args.join('\n')
}

export function cleanStack(stack: string): string {
  return stack
    .split(/\n/)
    .filter((l) => /^\s*at/.test(l))
    .join('\n')
}

export function logError(server: ViteDevServer, err: RollupError): void {
  const msg = buildErrorMessage(err, [
    colors.red(`Internal server error: ${err.message}`),
  ])

  server.config.logger.error(msg, {
    clear: true,
    timestamp: true,
    error: err,
  })

  server.environments.client.hot.send({
    type: 'error',
    err: prepareError(err),
  })
}

export function errorMiddleware(
  server: ViteDevServer,
  allowNext = false,
): ErrorHandler<ViteEnv> {
  // note the 4 args must be kept for connect to treat this as error middleware
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function viteErrorHandler(err, c) {
    console.log('[error] viteErrorHandler called for:', c.req.url)
    logError(server, err as RollupError)

    if (allowNext) {
      return c.text('Internal Server Error', 500)
    }

    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Error</title>
          <script type="module">
            const error = ${JSON.stringify(prepareError(err as RollupError)).replace(/</g, '\\u003c')}
            try {
              const { ErrorOverlay } = await import(${JSON.stringify(path.posix.join(server.config.base, CLIENT_PUBLIC_PATH))})
              document.body.appendChild(new ErrorOverlay(error))
            } catch {
              const h = (tag, text) => {
                const el = document.createElement(tag)
                el.textContent = text
                return el
              }
              document.body.appendChild(h('h1', 'Internal Server Error'))
              document.body.appendChild(h('h2', error.message))
              document.body.appendChild(h('pre', error.stack))
              document.body.appendChild(h('p', '(Error overlay failed to load)'))
            }
          </script>
        </head>
        <body>
        </body>
      </html>
    `
    return c.html(errorHtml, 500)
  }
}
