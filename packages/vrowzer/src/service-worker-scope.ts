/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export const DEFAULT_SERVICE_WORKER_SCOPE = '/'

declare const __VROWZER_INTERNAL_SERVICE_WORKER_SCOPE__: string

function getInjectedServiceWorkerScope(): string | undefined {
  return typeof __VROWZER_INTERNAL_SERVICE_WORKER_SCOPE__ === 'string'
    ? __VROWZER_INTERNAL_SERVICE_WORKER_SCOPE__
    : undefined
}

export function resolveServiceWorkerScope(
  runtimeScope?: string,
  injectedScope: string | undefined = getInjectedServiceWorkerScope()
): string {
  if (runtimeScope !== undefined && injectedScope !== undefined && runtimeScope !== injectedScope) {
    throw new Error(
      `Vrowzer serviceWorkerScope ${JSON.stringify(runtimeScope)} does not match @vrowzer/vite-plugin serviceWorkerScope ${JSON.stringify(injectedScope)}. Configure serviceWorkerScope in vite.config.ts.`
    )
  }

  return injectedScope ?? runtimeScope ?? DEFAULT_SERVICE_WORKER_SCOPE
}
