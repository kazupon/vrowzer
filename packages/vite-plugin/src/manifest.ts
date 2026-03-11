/**
 * Vite plugin that transforms vrowser-manifest.json imports.
 *
 * Replaces file path values with actual file contents so that
 * the imported manifest can be passed directly to Vrowser.ready().
 *
 * Use the `?vrowser` query suffix to trigger this plugin:
 *   import manifest from './vrowser-manifest.json?vrowser'
 *
 * @module manifest
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createDebug } from 'obug'

import type { Plugin } from 'vite'

const debug = createDebug('vite-plugin-vrowser:manifest')

function parseId(id: string): { filePath: string; isVrowser: boolean } {
  try {
    const url = new URL(id, 'file://')
    return {
      filePath: url.pathname,
      isVrowser: url.searchParams.has('vrowser')
    }
  } catch {
    return { filePath: id, isVrowser: false }
  }
}

export function VrowserManifest(): Plugin {
  return {
    name: 'vrowser:manifest-loader',
    resolveId(id) {
      if (parseId(id).isVrowser) {
        debug('resolveId:', id)
        return id
      }
    },
    load(id) {
      const { filePath, isVrowser } = parseId(id)
      if (!isVrowser) {
        return
      }
      debug('loading manifest:', filePath)

      const raw = readFileSync(filePath, 'utf-8')
      const manifest = JSON.parse(raw)
      const manifestDir = dirname(filePath)

      function resolveFiles(
        field: string,
        files: Record<string, string> | undefined
      ): Record<string, string> {
        if (!files) {
          return {}
        }
        const resolved: Record<string, string> = {}
        for (const [virtualPath, relPath] of Object.entries(files)) {
          try {
            resolved[virtualPath] = readFileSync(resolve(manifestDir, relPath), 'utf-8')
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
        vendor: resolveFiles('vendor', manifest.vendor),
        nodeModules: resolveFiles('nodeModules', manifest.nodeModules),
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
