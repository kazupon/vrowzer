import type { ResolvedPreviewOptions, ResolvedServerOptions } from '../..'

export function getAdditionalAllowedHosts(
  resolvedServerOptions: Pick<ResolvedServerOptions, 'host' | 'ws' | 'origin'>,
  resolvedPreviewOptions: Pick<ResolvedPreviewOptions, 'host'>,
): string[] {
  const list = []

  // allow host option by default as that indicates that the user is
  // expecting Vite to respond on that host
  if (
    typeof resolvedServerOptions.host === 'string' &&
    resolvedServerOptions.host
  ) {
    list.push(resolvedServerOptions.host)
  }
  if (
    typeof resolvedServerOptions.ws === 'object' &&
    resolvedServerOptions.ws.host
  ) {
    list.push(resolvedServerOptions.ws.host)
  }
  if (
    typeof resolvedPreviewOptions.host === 'string' &&
    resolvedPreviewOptions.host
  ) {
    list.push(resolvedPreviewOptions.host)
  }

  // allow server origin by default as that indicates that the user is
  // expecting Vite to respond on that host
  if (resolvedServerOptions.origin) {
    // some frameworks may pass the origin as a placeholder, so it's not
    // possible to parse as URL, so use a try-catch here as a best effort
    try {
      const serverOriginUrl = new URL(resolvedServerOptions.origin)
      list.push(serverOriginUrl.hostname)
    } catch { }
  }

  return list
}
