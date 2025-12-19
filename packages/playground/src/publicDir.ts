import path from 'pathe'
import { cleanUrl, withTrailingSlash } from './shared/utils.ts'
import { ERR_SYMLINK_IN_RECURSIVE_READDIR, normalizePath, tryStatSync } from './utils.ts'

import type { ResolvedConfig } from 'vite'

const publicFilesMap = new WeakMap<ResolvedConfig, Set<string>>()

export async function initPublicFiles(config: ResolvedConfig): Promise<Set<string> | undefined> {
  let fileNames: string[]
  try {
    // fileNames = await recursiveReaddir(config.publicDir)
    // TODO(kazupon): use recursiveReaddir when it supports symlink option
    fileNames = await Promise.resolve([])
  } catch (e) {
    // @ts-expect-error -- FIXME(kazupon): types
    if (e.code === ERR_SYMLINK_IN_RECURSIVE_READDIR) {
      return
    }
    throw e
  }
  const publicFiles = new Set(fileNames.map(fileName => fileName.slice(config.publicDir.length)))
  publicFilesMap.set(config, publicFiles)
  return publicFiles
}

function getPublicFiles(config: ResolvedConfig): Set<string> | undefined {
  return publicFilesMap.get(config)
}

export function checkPublicFile(url: string, config: ResolvedConfig): string | undefined {
  // note if the file is in /public, the resolver would have returned it
  // as-is so it's not going to be a fully resolved path.
  const { publicDir } = config
  if (!publicDir || url[0] !== '/') {
    return
  }

  const fileName = cleanUrl(url)

  // short-circuit if we have an in-memory publicFiles cache
  const publicFiles = getPublicFiles(config)
  if (publicFiles) {
    return publicFiles.has(fileName) ? normalizePath(path.join(publicDir, fileName)) : undefined
  }

  const publicFile = normalizePath(path.join(publicDir, fileName))
  if (!publicFile.startsWith(withTrailingSlash(publicDir))) {
    // can happen if URL starts with '../'
    return
  }

  return tryStatSync(publicFile)?.isFile() ? publicFile : undefined
}
