/**
 * vite-plugin-vrowser options
 *
 * @module options
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

export interface VrowserOptions {
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
  /**
   * Explicit Service Worker entry file path.
   * When specified, `unplugin-service-worker` will bundle this file directly
   * instead of scanning source code for `createSvcWorkerController()` calls.
   *
   * This is required when using a library-provided Service Worker (e.g. `vrowser/service-worker`)
   * that is in `node_modules` and excluded from code scanning.
   *
   * @example 'vrowser/service-worker'
   * @default undefined
   */
  serviceWorkerEntry?: string
  /**
   * Path to the vrowser config file.
   * When specified, this path is used directly instead of auto-detection.
   * When omitted, the plugin will search for `vrowser.config.{ts,js,mts,mjs}` in the project root.
   *
   * @default undefined
   */
  configFile?: string
}

export type ResolvedVrowserOptions = Required<VrowserOptions>

export function resolveOptions(options: VrowserOptions): ResolvedVrowserOptions {
  return {
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerScope: options.serviceWorkerScope ?? '/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'SEVICE_WORKER_VERSION',
    serviceWorkerEntry: options.serviceWorkerEntry ?? '',
    configFile: options.configFile ?? ''
  }
}
