/**
 * @vrowzer/rolldown/utils
 *
 * Provides utility APIs compatible with `rolldown/utils`.
 * In the browser environment, these are re-exported from `@rolldown/browser/experimental`.
 *
 * Note: `@rolldown/browser` does not export `./utils` yet,
 * so we re-export from `./experimental` where these APIs are deprecated but functional.
 *
 * @module utils
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// Transform
export { transform, transformSync } from '@rolldown/browser/experimental'
export type { TransformOptions, TransformResult } from '@rolldown/browser/experimental'

// Parse
export { parse, parseSync } from '@rolldown/browser/experimental'
export type { ParseResult, ParserOptions } from '@rolldown/browser/experimental'

// Minify
export { minify, minifySync } from '@rolldown/browser/experimental'
export type { MinifyOptions, MinifyResult } from '@rolldown/browser/experimental'

// TsconfigCache
export { TsconfigCache } from '@rolldown/browser/experimental'
