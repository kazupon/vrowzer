import { isParentDirectory, isSameFilePath } from '../utils.ts'

import type { ResolvedConfig } from 'vite'

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param targetPath - normalized absolute path
 * @param filePath - normalized absolute path
 */
export function isFileInTargetPath(targetPath: string, filePath: string): boolean {
  return isSameFilePath(targetPath, filePath) || isParentDirectory(targetPath, filePath)
}

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 */
export function isFileLoadingAllowed(config: ResolvedConfig, filePath: string): boolean {
  const { fs } = config.server

  if (!fs.strict) return true

  // NOTE: `fs.readFile('/foo.png/')` tries to load `'/foo.png'`
  // so we should check the path without trailing slash
  const filePathWithoutTrailingSlash = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath
  // @ts-expect-error -- TODO(kazupon):
  if (config.fsDenyGlob(filePathWithoutTrailingSlash)) return false
  // @ts-expect-error -- TODO(kazupon):
  if (config.safeModulePaths.has(filePath)) return true

  if (fs.allow.some(uri => isFileInTargetPath(uri, filePath))) return true

  return false
}
