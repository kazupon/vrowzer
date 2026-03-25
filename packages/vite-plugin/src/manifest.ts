/**
 * Vite plugin that transforms vrowzer-manifest.json imports.
 *
 * Replaces file path values with actual file contents so that
 * the imported manifest can be passed directly to Vrowzer.ready().
 *
 * Use the `?vrowzer` query suffix to trigger this plugin:
 *   import manifest from './vrowzer-manifest.json?vrowzer'
 *
 * @module manifest
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { minifySync } from 'rolldown/experimental'
import { createDebug } from 'obug'

import type { Plugin } from 'vite'

const MINIFIABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs'])

const debug = createDebug('vite-plugin-vrowzer:manifest')

function parseId(id: string): { filePath: string; isVrowzer: boolean } {
  try {
    const url = new URL(id, 'file://')
    return {
      filePath: url.pathname,
      isVrowzer: url.searchParams.has('vrowzer')
    }
  } catch {
    return { filePath: id, isVrowzer: false }
  }
}

export function VrowzerManifest(): Plugin {
  return {
    name: 'vrowzer:manifest-loader',
    resolveId(id) {
      if (parseId(id).isVrowzer) {
        debug('resolveId:', id)
        return id
      }
    },
    load(id) {
      const { filePath, isVrowzer } = parseId(id)
      if (!isVrowzer) {
        return
      }
      debug('loading manifest:', filePath)

      const raw = readFileSync(filePath, 'utf-8')
      const manifest = JSON.parse(raw)
      const manifestDir = dirname(filePath)

      function resolveFiles(
        field: string,
        files: Record<string, string> | undefined,
        minify = false
      ): Record<string, string> {
        if (!files) {
          return {}
        }
        const resolved: Record<string, string> = {}
        for (const [virtualPath, relPath] of Object.entries(files)) {
          try {
            let content = readFileSync(resolve(manifestDir, relPath), 'utf-8')
            if (minify && MINIFIABLE_EXTENSIONS.has(extname(virtualPath))) {
              const result = minifySync(virtualPath, content)
              if (result.code) {
                content = result.code
              }
            }
            resolved[virtualPath] = content
          } catch (e) {
            debug('failed to read %s %s: %s', field, relPath, (e as Error).message)
          }
        }
        debug('%s: %d files resolved', field, Object.keys(resolved).length)
        return resolved
      }

      const result = {
        name: manifest.name,
        files: resolveFiles('files', manifest.files),
        vendor: resolveFiles('vendor', manifest.vendor, true),
        nodeModules: resolveFiles('nodeModules', manifest.nodeModules, true),
        activeFile: manifest.activeFile
      }

      debug(
        'manifest loaded: %s (%d files, %d vendor, %d nodeModules)',
        result.name,
        Object.keys(result.files).length,
        Object.keys(result.vendor).length,
        Object.keys(result.nodeModules).length
      )

      return {
        code: `export default ${JSON.stringify(result)}`,
        moduleType: 'js'
      }
    }
  }
}
