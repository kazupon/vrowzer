import { isInternalRolldownAssetUrl } from './internalAssets'

function isWithinBasePath(pathname: string, basePath: string): boolean {
  if (basePath === '/') {
    return true
  }

  const baseRoot = basePath.replace(/\/+$/, '')
  if (!baseRoot.startsWith('/')) {
    return false
  }

  return pathname === baseRoot || pathname.startsWith(`${baseRoot}/`)
}

export function shouldHandleViteFetch(
  rawUrl: string,
  workerOrigin: string,
  basePath: string
): boolean {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false
    }
    if (url.origin !== workerOrigin || !isWithinBasePath(url.pathname, basePath)) {
      return false
    }

    return !isInternalRolldownAssetUrl(url.href)
  } catch {
    return false
  }
}
