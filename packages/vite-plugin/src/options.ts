/**
 * vite-plugin-vrowzer options
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

export interface VrowzerManifestOptions {
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

export interface VrowzerIdeOptions {
  /**
   * Port for the birpc WebSocket server.
   * @default auto (find available port)
   */
  port?: number
}

export interface VrowzerExperimentalOptions {
  /**
   * Enable browser IDE at `/__vrowzer__/`.
   *
   * When `true` or an options object, the plugin serves a browser-based IDE
   * with Monaco Editor, File Explorer, and Preview at `/__vrowzer__/`.
   *
   * @default false (disabled)
   */
  ide?: boolean | VrowzerIdeOptions
  /**
   * Enable Vite DevTools panel in IDE.
   *
   * Requires `@vitejs/devtools` to be installed and configured
   * in `vite.config.ts` (with injection plugin excluded).
   *
   * @default false
   */
  devtools?: boolean
}

export interface VrowzerOptions {
  /**
   * Enable auto-generation of vrowzer manifest.
   *
   * When `true` (default), the plugin automatically generates the manifest from
   * the project's package.json dependencies in `configResolved`. The manifest is
   * cached in `node_modules/.vrowzer-manifest/` and provided via the
   * `virtual:vrowzer-manifest` virtual module.
   *
   * When `false`, use `VrowzerManifest()` plugin with a manually created
   * `vrowzer-manifest.json` file (e.g. via `gen:manifest`).
   *
   * @default true
   */
  auto?: boolean
  /**
   * Auto manifest generation options (used when auto: true).
   */
  manifest?: VrowzerManifestOptions
  /**
   * The base path for the preview system location, which is used to serve the preview files via service worker of Vrowzer.
   *
   * @default '/__preview__/'
   */
  basePath?: string
  /**
   * The scope for the service worker of Vrowzer, which determines the range of URLs that the service worker will control.
   *
   * @default '/' (the entire origin)
   */
  serviceWorkerScope?: string
  /**
   * The version of the service worker for Vrowzer, which can be used to manage updates and cache invalidation for the preview system.
   *
   * @default 'SERVICE_WORKER_VERSION'
   */
  serviceWorkerVersion?: string
  /**
   * Explicit Service Worker entry file path.
   * When specified, `unplugin-service-worker` will bundle this file directly
   * instead of scanning source code for `createSvcWorkerController()` calls.
   *
   * This is required when using a library-provided Service Worker (e.g. `vrowzer/service-worker`)
   * that is in `node_modules` and excluded from code scanning.
   *
   * @example 'vrowzer/service-worker'
   * @default Resolved path to 'vrowzer/service-worker' (node_modules/vrowzer/dist/service-worker.ts)
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
  /**
   * Experimental features.
   */
  experimental?: VrowzerExperimentalOptions
}

export interface ResolvedIdeOptions {
  enabled: boolean
  port: number | undefined
  devtools: boolean
}

export interface ResolvedVrowzerOptions {
  auto: boolean
  manifest: VrowzerManifestOptions | undefined
  ide: ResolvedIdeOptions
  basePath: string
  serviceWorkerScope: string
  serviceWorkerVersion: string
  serviceWorkerEntry: string
  resolve: { alias?: Alias[] } | undefined
}

function resolveDefaultServiceWorkerEntry(): string {
  try {
    return fileURLToPath(import.meta.resolve('vrowzer/service-worker'))
  } catch {
    return ''
  }
}

export function resolveOptions(options: VrowzerOptions): ResolvedVrowzerOptions {
  const ide = options.experimental?.ide
  return {
    auto: options.auto ?? true,
    manifest: options.manifest,
    ide: {
      enabled: !!ide,
      port: typeof ide === 'object' ? ide.port : undefined,
      devtools: options.experimental?.devtools ?? false
    },
    basePath: options.basePath ?? '/__preview__/',
    serviceWorkerScope: options.serviceWorkerScope ?? '/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? 'SERVICE_WORKER_VERSION',
    serviceWorkerEntry: options.serviceWorkerEntry ?? resolveDefaultServiceWorkerEntry(),
    resolve: options.resolve
  }
}
