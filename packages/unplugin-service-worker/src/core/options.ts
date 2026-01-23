/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { FilterPattern } from 'unplugin'

/**
 * Options for the Service Worker plugin.
 */
export interface Options {
  /**
   * Files to include for Service Worker processing.
   *
   * @default [/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/]
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
  serviceWorkerAllowed?: string
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<
  Required<Options>,
  Pick<Options, 'enforce' | 'serviceWorkerAllowed'>
>

export function resolveOptions(options: Options): OptionsResolved {
  return {
    // Include JS/TS files and Vue/Svelte SFC files by default
    include: options.include || [/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/],
    exclude: options.exclude || [/node_modules/],
    enforce: 'enforce' in options ? options.enforce : 'pre',
    serviceWorkerAllowed: options.serviceWorkerAllowed
  }
}
