import type {
  EsbuildTransformOptions,
  EsbuildTransformResult as RawEsbuildTransformResult
} from '#types/internal/esbuildOptions'
import type { SourceMap } from 'rolldown'
import type { ResolvedConfig } from '../config'
import {
  createDebugger
} from '../utils'

const debug = createDebugger('vite:esbuild')

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

export type ESBuildTransformResult = Omit<RawEsbuildTransformResult, 'map'> & {
  map: SourceMap
}

type TSConfigJSON = {
  extends?: string
  compilerOptions?: {
    alwaysStrict?: boolean
    experimentalDecorators?: boolean
    importsNotUsedAsValues?: 'remove' | 'preserve' | 'error'
    jsx?: 'preserve' | 'react' | 'react-jsx' | 'react-jsxdev'
    jsxFactory?: string
    jsxFragmentFactory?: string
    jsxImportSource?: string
    preserveValueImports?: boolean
    target?: string
    useDefineForClassFields?: boolean
    emitDecoratorMetadata?: boolean
    verbatimModuleSyntax?: boolean
  }
  [key: string]: any
}
export type TSCompilerOptions = NonNullable<TSConfigJSON['compilerOptions']>

// TODO: fill in code ...

export async function loadTsconfigJsonForFile(
  filename: string,
  config?: ResolvedConfig,
): Promise<{ tsconfigFile: string; tsconfig: TSConfigJSON }> {
  // TODO(kazupon): disable tsconfig loading, because 'tsconfck' package seem hard to resolve in browser environment
  // const { tsconfig, tsconfigFile } = await parse(filename, {
  //   cache: getTSConfckCache(config),
  //   ignoreNodeModules: true,
  // })
  return { tsconfigFile: '', tsconfig: {} }
}
