/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const DEFAULT_PREVIEW_BASE_PATH = '/__preview__/'

declare const __VROWZER_INTERNAL_PREVIEW_BASE_PATH__: string

function getInjectedPreviewBasePath(): string | undefined {
  return typeof __VROWZER_INTERNAL_PREVIEW_BASE_PATH__ === 'string'
    ? __VROWZER_INTERNAL_PREVIEW_BASE_PATH__
    : undefined
}

export function normalizePreviewBasePath(basePath: string): string {
  if (
    basePath.length === 0 ||
    !basePath.startsWith('/') ||
    basePath.startsWith('//') ||
    basePath.includes('?') ||
    basePath.includes('#')
  ) {
    throw new TypeError(
      `Vrowzer basePath must be a non-root absolute pathname without a query or hash, received ${JSON.stringify(basePath)}`
    )
  }

  const pathname = basePath.replace(/\/+$/, '')
  if (pathname.length === 0) {
    throw new TypeError('Vrowzer basePath must not be the origin root "/"')
  }

  return `${pathname}/`
}

export function resolvePreviewBasePath(
  runtimeBasePath?: string,
  injectedBasePath: string | undefined = getInjectedPreviewBasePath()
): string {
  const runtime =
    runtimeBasePath === undefined ? undefined : normalizePreviewBasePath(runtimeBasePath)
  const injected =
    injectedBasePath === undefined ? undefined : normalizePreviewBasePath(injectedBasePath)

  if (runtime !== undefined && injected !== undefined && runtime !== injected) {
    throw new Error(
      `Vrowzer basePath ${JSON.stringify(runtime)} does not match @vrowzer/vite-plugin basePath ${JSON.stringify(injected)}. Configure basePath in vite.config.ts.`
    )
  }

  return injected ?? runtime ?? DEFAULT_PREVIEW_BASE_PATH
}
