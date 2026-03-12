/**
 * vite-plugin-vrowser options
 *
 * @module options
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { fileURLToPath } from 'node:url'

export interface Alias {
  find: string | RegExp
  replacement: string
}

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
   * @default 'SERVICE_WORKER_VERSION'
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
   * @default Resolved path to 'vrowser/service-worker' (node_modules/vrowser/dist/service-worker.ts)
   */
  serviceWorkerEntry?: string
  /**
   * Worker-specific resolve settings (e.g. vendor aliases).
   * These are NOT added to the host Vite config (which would break host package resolution),
   * but are passed to the Worker's internal Vite dev server.
   *
   * @example { alias: [{ find: 'vue', replacement: '/vendor/vue.js' }] }
   * @default undefined
   */
  resolve?: { alias?: Alias[] }
}

export interface ResolvedVrowserOptions {
  basePath: string
  serviceWorkerScope: string
  serviceWorkerVersion: string
  serviceWorkerEntry: string
  resolve: { alias?: Alias[] } | undefined
}

function resolveDefaultServiceWorkerEntry(): string {
  try {
    return fileURLToPath(import.meta.resolve('vrowser/service-worker'))
  } catch {
    return ''
  }
}

export function resolveOptions(options: VrowserOptions): ResolvedVrowserOptions {
  return {
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerScope: options.serviceWorkerScope ?? '/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'SERVICE_WORKER_VERSION',
    serviceWorkerEntry: options.serviceWorkerEntry ?? resolveDefaultServiceWorkerEntry(),
    resolve: options.resolve
  }
}
