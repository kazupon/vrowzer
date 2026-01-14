/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { FilterPattern } from 'unplugin'

export interface Options {
  include?: FilterPattern
  exclude?: FilterPattern
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
