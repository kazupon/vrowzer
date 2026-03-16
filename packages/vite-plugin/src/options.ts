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

export interface VrowserManifestOptions {
  /**
   * Directory to scan for project source files (index.html, src/, public/).
   * When the host page and preview content are in different directories,
   * set this to the preview content directory.
   *
   * Resolved relative to Vite's project root.
   *
   * @default Vite project root
   */
  sourceDir?: string
  /**
   * Package directory for node_modules resolution.
   * Defaults to sourceDir.
   */
  pkgDir?: string
  /**
   * Package name(s) to include in nodeModules.
   * When specified, only these packages (+ their transitive deps) are included.
   * When omitted, all dependencies are included.
   */
  targets?: string[]
}

export interface VrowserOptions {
  /**
   * Enable auto-generation of vrowser manifest.
   *
   * When `true` (default), the plugin automatically generates the manifest from
   * the project's package.json dependencies in `configResolved`. The manifest is
   * cached in `node_modules/.vrowser-manifest/` and provided via the
   * `virtual:vrowser-manifest` virtual module.
   *
   * When `false`, use `VrowserManifest()` plugin with a manually created
   * `vrowser-manifest.json` file (e.g. via `gen:manifest`).
   *
   * @default true
   */
  auto?: boolean
  /**
   * Auto manifest generation options (used when auto: true).
   */
  manifest?: VrowserManifestOptions
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
  auto: boolean
  manifest: VrowserManifestOptions | undefined
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
    auto: options.auto ?? true,
    manifest: options.manifest,
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerScope: options.serviceWorkerScope ?? '/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'SERVICE_WORKER_VERSION',
    serviceWorkerEntry: options.serviceWorkerEntry ?? resolveDefaultServiceWorkerEntry(),
    resolve: options.resolve
  }
}
