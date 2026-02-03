import type {
  EsbuildTransformOptions
} from '#types/internal/esbuildOptions'

// TODO: fill in code ...

// IIFE content looks like `var MyLib = function() {`.
// Spaces are removed and parameters are mangled when minified
const IIFE_BEGIN_RE =
  /(?:const|var)\s+\S+\s*=\s*\(?function\([^()]*\)\s*\{\s*"use strict";/

const validExtensionRE = /\.\w+$/
const jsxExtensionsRE = /\.(?:j|t)sx\b/

// the final build should always support dynamic import and import.meta.
// if they need to be polyfilled, plugin-legacy should be used.
// plugin-legacy detects these two features when checking for modern code.
// Browser support: https://caniuse.com/es6-module-dynamic-import,mdn-javascript_operators_import_meta#:~:text=Feature%20summary
export const defaultEsbuildSupported = {
  'dynamic-import': true,
  'import-meta': true,
}

export interface ESBuildOptions extends EsbuildTransformOptions {
  include?: string | RegExp | ReadonlyArray<string | RegExp>
  exclude?: string | RegExp | ReadonlyArray<string | RegExp>
  jsxInject?: string
  /**
   * This option is not respected. Use `build.minify` instead.
   */
  minify?: never
}

// TODO: fill in code ...
