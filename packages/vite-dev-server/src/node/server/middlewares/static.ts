import escapeHtml from 'escape-html'
// NOTE(kazupon): Replace node:http ServerResponse with hono Context for browser env
// import type { ServerResponse } from 'node:http'
import type { Context } from 'hono'
import {
  slash
} from '../../../shared/utils'
import type { ResolvedConfig } from '../../config'
import type { ViteDevServer } from '../../server'
import {
  fsPathFromUrl,
  isFileReadable,
  isParentDirectory,
  isSameFilePath
} from '../../utils'
import type { ViteEnv } from '../index'

const knownJavascriptExtensionRE = /\.(?:[tj]sx?|[cm][tj]s)$/
const ERR_DENIED_FILE = 'ERR_DENIED_FILE'

// TODO: fill in later ...

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
// NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
// export function respondWithAccessDenied(
//   id: string,
//   server: ViteDevServer,
//   res: ServerResponse,
// ): void {
//   const urlMessage = `The request id "${id}" is outside of Vite serving allow list.`
//   const hintMessage = `
// ${server.config.server.fs.allow.map((i) => `- ${i}`).join('\n')}
//
// Refer to docs https://vite.dev/config/server-options.html#server-fs-allow for configurations and more details.`
//
//   server.config.logger.error(urlMessage)
//   server.config.logger.warnOnce(hintMessage + '\n')
//   res.statusCode = 403
//   res.write(renderRestrictedErrorHTML(urlMessage + '\n' + hintMessage))
//   res.end()
// }

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
