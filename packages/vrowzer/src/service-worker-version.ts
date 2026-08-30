/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const DEFAULT_SERVICE_WORKER_VERSION = 'vrowzer-v1'
export const VROWZER_SERVICE_WORKER_VERSION_QUERY = 'vrowzer-version'

declare const __VROWZER_INTERNAL_SERVICE_WORKER_VERSION__: string

function getInjectedServiceWorkerVersion(): string | undefined {
  return typeof __VROWZER_INTERNAL_SERVICE_WORKER_VERSION__ === 'string'
    ? __VROWZER_INTERNAL_SERVICE_WORKER_VERSION__
    : undefined
}

export function resolveServiceWorkerVersion(
  runtimeVersion?: string,
  injectedVersion: string | undefined = getInjectedServiceWorkerVersion()
): string {
  if (
    runtimeVersion !== undefined &&
    injectedVersion !== undefined &&
    runtimeVersion !== injectedVersion
  ) {
    throw new Error(
      `Vrowzer serviceWorkerVersion ${JSON.stringify(runtimeVersion)} does not match @vrowzer/vite-plugin serviceWorkerVersion ${JSON.stringify(injectedVersion)}. Configure serviceWorkerVersion in vite.config.ts.`
    )
  }

  return injectedVersion ?? runtimeVersion ?? DEFAULT_SERVICE_WORKER_VERSION
}

export function withServiceWorkerVersion(scriptURL: URL, version: string): URL {
  const versionedScriptURL = new URL(scriptURL.href)
  versionedScriptURL.searchParams.set(VROWZER_SERVICE_WORKER_VERSION_QUERY, version)
  return versionedScriptURL
}

export function resolveServiceWorkerVersionForWorker(
  scriptURL: string | URL,
  injectedVersion: string | undefined = getInjectedServiceWorkerVersion()
): string {
  const url = typeof scriptURL === 'string' ? new URL(scriptURL) : scriptURL
  const queryVersion = url.searchParams.has(VROWZER_SERVICE_WORKER_VERSION_QUERY)
    ? (url.searchParams.get(VROWZER_SERVICE_WORKER_VERSION_QUERY) ?? '')
    : undefined

  if (
    injectedVersion !== undefined &&
    queryVersion !== undefined &&
    injectedVersion !== queryVersion
  ) {
    throw new Error(
      `Vrowzer injected serviceWorkerVersion ${JSON.stringify(injectedVersion)} does not match Service Worker script URL version ${JSON.stringify(queryVersion)}.`
    )
  }

  return injectedVersion ?? queryVersion ?? DEFAULT_SERVICE_WORKER_VERSION
}
