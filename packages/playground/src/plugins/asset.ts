// TODO(kazupon): use virtual fs
import * as mrmime from 'mrmime'
// TODO(kazupon): switch to `@rolldown/browser` memfs
import { Buffer } from 'node:buffer'
import fsp from 'node:fs/promises'
import path from 'pathe'
import colors from 'picocolors'
import { DEFAULT_ASSETS_INLINE_LIMIT, FS_PREFIX } from '../constants.ts'
import { checkPublicFile } from '../publicDir.ts'
import { cleanUrl, splitFileAndPostfix, withTrailingSlash } from '../shared/utils.ts'
import { joinUrlSegments, normalizePath, removeLeadingSlash } from '../utils.ts'

import type { PluginContext } from '@rolldown/browser'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Environment } from '../ssr/environment.ts'

// referenceId is base64url but replaces - with $
export const assetUrlRE: RegExp = /__VITE_ASSET__([\w$]+)__(?:\$_(.*?)__)?/g

const jsSourceMapRE = /\.[cm]?js\.map$/
export const noInlineRE: RegExp = /[?&]no-inline\b/
export const inlineRE: RegExp = /[?&]inline\b/

const assetCache = new WeakMap<Environment, Map<string, string>>()

// ---

/**
 * Also supports loading plain strings with import text from './foo.txt?raw'
 */
export function assetPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:asset'

    // ---
  }
}

export async function fileToUrl(pluginContext: PluginContext, id: string): Promise<string> {
  const { environment } = pluginContext
  if (environment.config.command === 'serve') {
    return fileToDevUrl(environment, id)
  } else {
    return fileToBuiltUrl(pluginContext, id)
  }
}

export async function fileToDevUrl(
  environment: Environment,
  id: string,
  skipBase = false
): Promise<string> {
  const config = environment.getTopLevelConfig()
  const publicFile = checkPublicFile(id, config)

  // If has inline query, unconditionally inline the asset
  if (inlineRE.test(id)) {
    const file = publicFile || cleanUrl(id)
    const content = await fsp.readFile(file)
    return assetToDataURL(environment, file, content)
  }

  // If is svg and it's inlined in build, also inline it in dev to match
  // the behaviour in build due to quote handling differences.
  const cleanedId = cleanUrl(id)
  if (cleanedId.endsWith('.svg')) {
    const file = publicFile || cleanedId
    const content = await fsp.readFile(file)
    if (shouldInline(environment, file, id, content, undefined, undefined)) {
      return assetToDataURL(environment, file, content)
    }
  }

  let rtn: string
  if (publicFile) {
    // in public dir during dev, keep the url as-is
    rtn = id
  } else if (id.startsWith(withTrailingSlash(config.root))) {
    // in project root, infer short public path
    rtn = '/' + path.posix.relative(config.root, id)
  } else {
    // outside of project root, use absolute fs path
    // (this is special handled by the serve static middleware
    rtn = path.posix.join(FS_PREFIX, id)
  }
  if (skipBase) {
    return rtn
  }
  // @ts-expect-error -- FIXME(kazupon): types
  const base = joinUrlSegments(config.server.origin ?? '', config.decodedBase)
  return joinUrlSegments(base, removeLeadingSlash(rtn))
}

export function getPublicAssetFilename(hash: string, config: ResolvedConfig): string | undefined {
  return publicAssetUrlCache.get(config)?.get(hash)
}

// inner map: hash -> url
export const publicAssetUrlCache: WeakMap<ResolvedConfig, Map<string, string>> = new WeakMap()

export const publicAssetUrlRE: RegExp = /__VITE_PUBLIC_ASSET__([a-z\d]{8})__/g

export function publicFileToBuiltUrl(url: string, config: ResolvedConfig): string {
  if (config.command !== 'build') {
    // We don't need relative base or renderBuiltUrl support during dev
    // @ts-expect-error -- FIXME(kazupon): types
    return joinUrlSegments(config.decodedBase, url)
  }
  // TODO(kazupon): use alternative hash
  // const hash = getHash(url)
  const hash = ''
  let cache = publicAssetUrlCache.get(config)
  if (!cache) {
    cache = new Map<string, string>()
    publicAssetUrlCache.set(config, cache)
  }
  if (!cache.get(hash)) {
    cache.set(hash, url)
  }
  return `__VITE_PUBLIC_ASSET__${hash}__`
}

const GIT_LFS_PREFIX = Buffer.from('version https://git-lfs.github.com')
function isGitLfsPlaceholder(content: Buffer): boolean {
  if (content.length < GIT_LFS_PREFIX.length) return false
  // Check whether the content begins with the characteristic string of Git LFS placeholders
  return GIT_LFS_PREFIX.compare(content, 0, GIT_LFS_PREFIX.length) === 0
}

/**
 * Register an asset to be emitted as part of the bundle (if necessary)
 * and returns the resolved public URL
 */
async function fileToBuiltUrl(
  pluginContext: PluginContext,
  id: string,
  skipPublicCheck = false,
  forceInline?: boolean
): Promise<string> {
  const environment = pluginContext.environment
  const topLevelConfig = environment.getTopLevelConfig()
  if (!skipPublicCheck) {
    const publicFile = checkPublicFile(id, topLevelConfig)
    if (publicFile) {
      if (inlineRE.test(id)) {
        // If inline via query, re-assign the id so it can be read by the fs and inlined
        id = publicFile
      } else {
        return publicFileToBuiltUrl(id, topLevelConfig)
      }
    }
  }

  const cache = assetCache.get(environment)!
  const cached = cache.get(id)
  if (cached) {
    return cached
  }

  let { file, postfix } = splitFileAndPostfix(id)
  const content = await fsp.readFile(file)

  let url: string
  if (shouldInline(environment, file, id, content, pluginContext, forceInline)) {
    url = assetToDataURL(environment, file, content)
  } else {
    // emit as asset
    const originalFileName = normalizePath(path.relative(environment.config.root, file))
    const referenceId = pluginContext.emitFile({
      type: 'asset',
      // Ignore directory structure for asset file names
      name: path.basename(file),
      originalFileName,
      source: content
    })

    if (environment.config.command === 'build' && noInlineRE.test(postfix)) {
      postfix = postfix.replace(noInlineRE, '').replace(/^&/, '?')
    }

    url = `__VITE_ASSET__${referenceId}__${postfix ? `$_${postfix}__` : ``}`
  }

  cache.set(id, url)
  return url
}

export async function urlToBuiltUrl(
  pluginContext: PluginContext,
  url: string,
  importer: string,
  forceInline?: boolean
): Promise<string> {
  const topLevelConfig = pluginContext.environment.getTopLevelConfig()
  if (checkPublicFile(url, topLevelConfig)) {
    return publicFileToBuiltUrl(url, topLevelConfig)
  }
  const file = normalizePath(
    url[0] === '/' ? path.join(topLevelConfig.root, url) : path.join(path.dirname(importer), url)
  )
  return fileToBuiltUrl(
    pluginContext,
    file,
    // skip public check since we just did it above
    true,
    forceInline
  )
}

function shouldInline(
  environment: Environment,
  file: string,
  id: string,
  content: Buffer,
  /** Should be passed only in build */
  buildPluginContext: PluginContext | undefined,
  forceInline: boolean | undefined
): boolean {
  if (noInlineRE.test(id)) return false
  if (inlineRE.test(id)) return true
  // Do build only checks if passed the plugin context during build
  if (buildPluginContext) {
    if (environment.config.build.lib) return true
    if (buildPluginContext.getModuleInfo(id)?.isEntry) return false
  }
  if (forceInline !== undefined) return forceInline
  if (file.endsWith('.html')) return false
  // Don't inline SVG with fragments, as they are meant to be reused
  if (file.endsWith('.svg') && id.includes('#')) return false
  let limit: number
  const { assetsInlineLimit } = environment.config.build
  if (typeof assetsInlineLimit === 'function') {
    const userShouldInline = assetsInlineLimit(file, content)
    if (userShouldInline != null) return userShouldInline
    limit = DEFAULT_ASSETS_INLINE_LIMIT
  } else {
    limit = Number(assetsInlineLimit)
  }
  return content.length < limit && !isGitLfsPlaceholder(content)
}

function assetToDataURL(environment: Environment, file: string, content: Buffer) {
  if (environment.config.build.lib && isGitLfsPlaceholder(content)) {
    environment.logger.warn(colors.yellow(`Inlined file ${file} was not downloaded via Git LFS`))
  }

  if (file.endsWith('.svg')) {
    return svgToDataURL(content)
  } else {
    const mimeType = mrmime.lookup(file) ?? 'application/octet-stream'
    // base64 inlined as a string
    return `data:${mimeType};base64,${content.toString('base64')}`
  }
}

const nestedQuotesRE = /"[^"']*'[^"]*"|'[^'"]*"[^']*'/

// Inspired by https://github.com/iconify/iconify/blob/main/packages/utils/src/svg/url.ts
function svgToDataURL(content: Buffer): string {
  const stringContent = content.toString()
  // If the SVG contains some text or HTML, any transformation is unsafe, and given that double quotes would then
  // need to be escaped, the gain to use a data URI would be ridiculous if not negative
  if (
    stringContent.includes('<text') ||
    stringContent.includes('<foreignObject') ||
    nestedQuotesRE.test(stringContent)
  ) {
    return `data:image/svg+xml;base64,${content.toString('base64')}`
  } else {
    return (
      'data:image/svg+xml,' +
      stringContent
        .trim()
        // @ts-expect-error -- NOTE(kazupon): fix
        .replaceAll(/>\s+</g, '><')
        .replaceAll('"', "'")
        .replaceAll('%', '%25')
        .replaceAll('#', '%23')
        .replaceAll('<', '%3c')
        .replaceAll('>', '%3e')
        // Spaces are not valid in srcset it has some use cases
        // it can make the uncompressed URI slightly higher than base64, but will compress way better
        // https://github.com/vitejs/vite/pull/14643#issuecomment-1766288673
        .replaceAll(/\s+/g, '%20')
    )
  }
}
