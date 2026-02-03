import type {
  TransformOptions as OxcTransformOptions
} from 'rolldown/experimental'

// TODO: fill in codes ...

// IIFE content looks like `var MyLib = (function() {`.
export const IIFE_BEGIN_RE: RegExp =
  /(?:(?:const|var)\s+\S+\s*=\s*|^|\n)\(?function\([^()]*\)\s*\{(?:\s*"use strict";)?/
// UMD content looks like `})(this, function(exports, external1, external2) {`.
export const UMD_BEGIN_RE: RegExp =
  /\}\)\((?:this,\s*)?function\([^()]*\)\s*\{(?:\s*"use strict";)?/

const jsxExtensionsRE = /\.(?:j|t)sx\b/
const validExtensionRE = /\.\w+$/

export interface OxcOptions extends Omit<
  OxcTransformOptions,
  'cwd' | 'sourceType' | 'lang' | 'sourcemap' | 'helpers'
> {
  include?: string | RegExp | ReadonlyArray<string | RegExp>
  exclude?: string | RegExp | ReadonlyArray<string | RegExp>
  jsxInject?: string
  jsxRefreshInclude?: string | RegExp | ReadonlyArray<string | RegExp>
  jsxRefreshExclude?: string | RegExp | ReadonlyArray<string | RegExp>
}

// TODO: fill in codes ...
