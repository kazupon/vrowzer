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

const DEFAULT_BASE_PATH = '/__preview__/'
const DEFAULT_SERVICE_WORKER_VERSION = 'vrowzer-v1'

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
   * Extract the host Vite config for the preview's Web Worker.
   *
   * Set `false` for embedding hosts whose plugins and source configuration should
   * not be copied into the preview, including resolved server settings.
   * Use `workerConfig` for preview-specific configuration. Legacy Worker-specific
   * `resolve` options still apply, with a migration warning.
   * This option is independent of auto manifest generation.
   * Omitted extraction is disabled when `workerConfig` is provided.
   *
   * @default true
   */
  extract?: boolean
  /**
   * Path to an ESM config object for Vite inside the preview's Web Worker.
   * Resolved relative to the host config file, or Vite's root when there is no file.
   * The file is prebundled without extracting or merging the host configuration.
   * Dev edits restart the host and reload the page; failed generation keeps the last bundle.
   * Explicit `extract: true` and build watch are not supported with this option.
   */
  workerConfig?: string
  /**
   * Auto manifest generation options (used when auto: true).
   */
  manifest?: VrowzerManifestOptions
  /**
   * The base path for the preview system location, which is used to serve the preview files via service worker of Vrowzer.
   * This is the source of truth for both the application and Service Worker bundles.
   *
   * @default '/__preview__/'
   */
  basePath?: string
  /**
   * The scope for the service worker of Vrowzer, which determines the range of URLs that
   * the service worker will control and the `Service-Worker-Allowed` response header.
   * The value is injected into the Vrowzer runtime, so its corresponding option can be
   * omitted. This registration scope is independent of the preview `basePath`.
   *
   * @default '/' (the entire origin)
   */
  serviceWorkerScope?: string
  /**
   * The version of the service worker for Vrowzer, which can be used to manage updates and cache invalidation for the preview system.
   * This is the source of truth for both the application and Service Worker bundles.
   *
   * @default 'vrowzer-v1'
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
   * When host extraction is disabled, move these settings to `workerConfig`.
   * For compatibility, this option replaces the entire Worker resolve object.
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
  extract: boolean
  workerConfig: string | undefined
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

function normalizeBasePath(basePath: string): string {
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

export function resolveOptions(options: VrowzerOptions): ResolvedVrowzerOptions {
  if (options.workerConfig !== undefined) {
    if (typeof options.workerConfig !== 'string' || options.workerConfig.trim().length === 0) {
      throw new TypeError('Vrowzer workerConfig must be a non-empty file path')
    }
    if (options.extract === true) {
      throw new TypeError('Vrowzer workerConfig cannot be combined with explicit extract: true')
    }
  }
  const ide = options.experimental?.ide
  return {
    auto: options.auto ?? true,
    extract: options.workerConfig === undefined ? (options.extract ?? true) : false,
    workerConfig: options.workerConfig,
    manifest: options.manifest,
    ide: {
      enabled: !!ide,
      port: typeof ide === 'object' ? ide.port : undefined,
      devtools: options.experimental?.devtools ?? false
    },
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_BASE_PATH),
    serviceWorkerScope: options.serviceWorkerScope ?? '/',
    serviceWorkerVersion: options.serviceWorkerVersion ?? DEFAULT_SERVICE_WORKER_VERSION,
    serviceWorkerEntry: options.serviceWorkerEntry ?? resolveDefaultServiceWorkerEntry(),
    resolve: options.resolve
  }
}
