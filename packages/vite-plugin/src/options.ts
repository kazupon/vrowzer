/**
 * vite-plugin-vrowser options
 *
 * @module options
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export interface VrowserPluginOptions {
  /**
   * The base path for the preview system location, which is used to serve the preview files via service worker of Vrowser.
   *
   * @default '/__preview__/'
   */
  basePath?: string
  /**
   * The scope for the service worker of Vrowser, which determines the range of URLs that the service worker will control.
   *
   * @default '/' (the entire origin)
   */
  serviceWorkerScope?: string
  /**
   * The version of the service worker for Vrowser, which can be used to manage updates and cache invalidation for the preview system.
   *
   * @default 'SEVICE_WORKER_VERSION'
   */
  serviceWorkerVersion?: string
  // TODO(kazupon): add some options, if we need
  // ...
}

export type ResolvedVrowserPluginOptions = Required<VrowserPluginOptions>

export function resolveOptions(options: VrowserPluginOptions): ResolvedVrowserPluginOptions {
  // TODO: resolve options with default values here
  // ...

  return {} as ResolvedVrowserPluginOptions
}
