/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { realpathSync } from 'node:fs'
import MagicString from 'magic-string'
import path from 'node:path'
import { SW_ASSET_PREFIX, SW_ASSET_SUFFIX } from './constants.ts'
import { hash } from './hash.ts'
import { injectDevQuery } from '../transform/dev.ts'

function safeRealpath(filePath: string): string {
  try {
    return path.normalize(realpathSync(filePath))
  } catch {
    return path.normalize(filePath)
  }
}

export function stripViteBase(pathname: string, base: string): string {
  const basePath = new URL(base, 'http://localhost').pathname
  if (basePath === '/') {
    return pathname
  }

  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  if (!pathname.startsWith(normalizedBase)) {
    return pathname
  }

  return `/${pathname.slice(normalizedBase.length)}`
}

/**
 * Rewrite `new URL('./entry-path', import.meta.url)` references to an explicit
 * Service Worker entry for the active bundler mode.
 */
export function rewriteEntryUrls(
  code: string,
  id: string,
  entryPath: string,
  root: string,
  mode: 'placeholder' | 'rollup' | 'dev',
  emitFile?: (file: { type: 'chunk'; id: string; name: string }) => string,
  rollupReferenceIds?: Map<string, string>,
  isTest = false
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  const urlPatternRE =
    /new\s+URL\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(?:['"`]\s*\+\s*)?import\.meta\.url\s*\)/g
  let urlMatch: RegExpExecArray | null
  const s = new MagicString(code)
  let hasReplacement = false

  while ((urlMatch = urlPatternRE.exec(code))) {
    const urlPath = urlMatch[2]
    if (!urlPath) {
      continue
    }

    const resolvedPath = urlPath.startsWith('.')
      ? path.resolve(path.dirname(id), urlPath)
      : urlPath.startsWith('/')
        ? path.resolve(root, urlPath)
        : null

    // Resolve workspace symlinks before comparing a library URL with the configured entry.
    if (resolvedPath && safeRealpath(resolvedPath) === safeRealpath(entryPath)) {
      if (mode === 'rollup') {
        if (!emitFile || !rollupReferenceIds) {
          throw new TypeError('Rollup entry URL rewriting requires emitFile and reference IDs')
        }
        let refId = rollupReferenceIds.get(entryPath)
        if (!refId) {
          refId = emitFile({
            type: 'chunk',
            id: entryPath,
            name: path.basename(entryPath, path.extname(entryPath))
          })
          rollupReferenceIds.set(entryPath, refId)
        }
        s.update(
          urlMatch.index,
          urlMatch.index + urlMatch[0].length,
          `new URL(import.meta.ROLLUP_FILE_URL_${refId})`
        )
      } else if (mode === 'placeholder') {
        const placeholder = `${SW_ASSET_PREFIX}${hash(entryPath)}${SW_ASSET_SUFFIX}`
        s.update(
          urlMatch.index,
          urlMatch.index + urlMatch[0].length,
          `new URL(/* @vite-ignore */ ${JSON.stringify(placeholder)}, '' + import.meta.url)`
        )
      } else {
        const devUrl = injectDevQuery(urlPath)
        const baseUrl = isTest ? 'self.location.href' : "'' + import.meta.url"
        s.update(
          urlMatch.index,
          urlMatch.index + urlMatch[0].length,
          `new URL(/* @vite-ignore */ ${JSON.stringify(devUrl)}, ${baseUrl})`
        )
      }
      hasReplacement = true
    }
  }

  if (!hasReplacement) {
    return null
  }

  return {
    code: s.toString(),
    map: s.generateMap({ source: id, file: `${id}.map`, includeContent: true })
  }
}
