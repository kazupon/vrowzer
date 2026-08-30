/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { FilterPattern } from 'unplugin'

export const SCRIPT_MODULE_ID_RE = /\.[cm]?[jt]sx?(?:$|[?#])/

/**
 * Options for the Service Worker plugin.
 */
export interface Options {
  /**
   * Explicit Service Worker entry file path.
   *
   * When specified, the plugin will bundle this file as a Service Worker
   * without scanning source code for `createSvcWorkerController()` calls.
   *
   * This is useful when the Service Worker entry is provided by a library
   * (e.g. `vrowzer`) that is in `node_modules` and excluded from scanning.
   *
   * @example './src/my-service-worker.ts'
   * @example 'vrowzer/service-worker'
   * @default undefined
   */
  entry?: string | undefined
  /**
   * Files to include for Service Worker processing.
   *
   * @default [/\.[cm]?[jt]sx?(?:$|[?#])/, /\.vue(?:$|[?#])/, /\.svelte(?:$|[?#])/]
   */
  include?: FilterPattern
  /**
   * Files to exclude from Service Worker processing.
   *
   * @default [/node_modules/]
   */
  exclude?: FilterPattern
  /**
   * Enforcement phase of the plugin.
   *
   * @default 'pre'
   */
  enforce?: 'pre' | 'post' | undefined
  /**
   * Set the Service-Worker-Allowed header for Vite dev server responses.
   * This allows registering a Service Worker with a scope broader than the script location.
   *
   * NOTE: This option only takes effect during Vite dev mode (`vite dev`).
   * In production builds, the Service Worker file is typically placed at the root
   * or the server should be configured to add this header.
   *
   * @example '/' - allows the SW to control the entire origin
   */
  serviceWorkerAllowed?: string | undefined
  /**
   * Additional rolldown plugins for the Service Worker bundler.
   * These are merged with plugins extracted from the parent bundler.
   *
   * For Vite/Rolldown/Rollup: parent bundler plugins are automatically forwarded.
   * For esbuild/Farm: parent plugins cannot be forwarded (different API),
   * so use this option to provide rolldown-compatible plugins manually.
   *
   * @default undefined
   */
  plugins?: import('rolldown').Plugin[] | undefined
  /**
   * Additional assets to emit alongside the Service Worker bundle.
   * These files are copied to the same output directory as the SW.
   *
   * Useful for production builds where WASM or other binary files
   * need to be served from the same location as the SW script.
   *
   * @default undefined
   */
  assets?: ServiceWorkerAssetConfig[] | undefined
  /**
   * Output format for the Service Worker bundle.
   * - `'iife'`: Immediately Invoked Function Expression (default, broadest compatibility)
   * - `'esm'`: ES Module format (requires browser ESM Service Worker support, Chrome 91+).
   *   ESM format preserves `import.meta.url` and dynamic `import()`, which is necessary
   *   when the Service Worker imports modules that contain top-level await (e.g. WASM).
   *
   * @default 'iife'
   */
  format?: 'iife' | 'esm' | undefined
}

/**
 * Configuration for an additional asset to emit alongside the Service Worker.
 */
export interface ServiceWorkerAssetConfig {
  /**
   * Source file path (absolute or relative to project root).
   */
  src: string
  /**
   * Output filename. Defaults to the basename of src.
   */
  fileName?: string
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<
  Required<Options>,
  Pick<Options, 'entry' | 'enforce' | 'serviceWorkerAllowed' | 'plugins' | 'assets' | 'format'>
>

export function resolveOptions(options: Options): OptionsResolved {
  return {
    entry: options.entry,
    // Include JS/TS files and Vue/Svelte SFC files by default
    include: options.include || [SCRIPT_MODULE_ID_RE, /\.vue(?:$|[?#])/, /\.svelte(?:$|[?#])/],
    exclude: options.exclude || [/node_modules/],
    enforce: 'enforce' in options ? options.enforce : 'pre',
    serviceWorkerAllowed: options.serviceWorkerAllowed,
    plugins: options.plugins,
    assets: options.assets,
    format: options.format
  }
}
