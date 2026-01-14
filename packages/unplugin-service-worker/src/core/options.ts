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
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<Required<Options>, Pick<Options, 'enforce'>>

export function resolveOptions(options: Options): OptionsResolved {
  return {
    // Include JS/TS files and Vue/Svelte SFC files by default
    include: options.include || [/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/],
    exclude: options.exclude || [/node_modules/],
    enforce: 'enforce' in options ? options.enforce : 'pre'
  }
}
