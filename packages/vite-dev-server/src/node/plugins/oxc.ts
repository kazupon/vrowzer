import type { FSWatcher } from '#dep-types/chokidar'
import type { RawSourceMap } from '@jridgewell/remapping'
import path from 'node:path'
import colors from 'picocolors'
import type { RollupError, SourceMap } from 'rolldown'
import type {
  TransformOptions as OxcTransformOptions,
  TransformResult as OxcTransformResult,
  TransformOptions,
} from 'rolldown/experimental'
// TODO(kazupon): Use `transformSync` via `@vrowser/oxc-transform` when oxc support browser environment
// import {
//   transformSync
// } from 'rolldown/experimental'
import { cleanUrl } from '../../shared/utils'
import type { ResolvedConfig } from '../config'
import type { Logger } from '../logger'
import {
  combineSourcemaps,
  ensureWatchedFile,
  generateCodeFrame
} from '../utils'
import type { ESBuildOptions, TSCompilerOptions } from './esbuild'
import { loadTsconfigJsonForFile } from './esbuild'

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

function getRollupJsxPresets(preset: 'react' | 'react-jsx'): OxcJsxOptions {
  switch (preset) {
    case 'react':
      return {
        runtime: 'classic',
        pragma: 'React.createElement',
        pragmaFrag: 'React.Fragment',
        importSource: 'react',
      }
    case 'react-jsx':
      return {
        runtime: 'automatic',
        pragma: 'React.createElement',
        importSource: 'react',
      }
  }
  preset satisfies never
}

export function setOxcTransformOptionsFromTsconfigOptions(
  oxcOptions: Omit<OxcTransformOptions, 'jsx'> & {
    jsx?:
    | OxcTransformOptions['jsx']
    | 'react'
    | 'react-jsx'
    | 'preserve-react'
    | false
  },
  tsCompilerOptions: Readonly<TSCompilerOptions> | undefined = {},
  warnings: string[],
): void {
  // when both the normal options and tsconfig is set,
  // we want to prioritize the normal options
  if (oxcOptions.jsx === 'preserve-react') {
    oxcOptions.jsx = 'preserve'
  }
  if (
    tsCompilerOptions.jsx === 'preserve' &&
    (oxcOptions.jsx === undefined ||
      (typeof oxcOptions.jsx === 'object' &&
        oxcOptions.jsx.runtime === undefined))
  ) {
    oxcOptions.jsx = 'preserve'
  }
  if (oxcOptions.jsx !== 'preserve' && oxcOptions.jsx !== false) {
    const jsxOptions: OxcJsxOptions =
      typeof oxcOptions.jsx === 'string'
        ? getRollupJsxPresets(oxcOptions.jsx)
        : { ...oxcOptions.jsx }
    const typescriptOptions = { ...oxcOptions.typescript }

    if (tsCompilerOptions.jsxFactory) {
      jsxOptions.pragma ??= tsCompilerOptions.jsxFactory
      typescriptOptions.jsxPragma = jsxOptions.pragma
    }
    if (tsCompilerOptions.jsxFragmentFactory) {
      jsxOptions.pragmaFrag ??= tsCompilerOptions.jsxFragmentFactory
      typescriptOptions.jsxPragmaFrag = jsxOptions.pragmaFrag
    }
    if (tsCompilerOptions.jsxImportSource) {
      jsxOptions.importSource ??= tsCompilerOptions.jsxImportSource
    }

    if (!jsxOptions.runtime) {
      switch (tsCompilerOptions.jsx) {
        case 'react':
          jsxOptions.runtime = 'classic'
          // this option should not be set when using classic runtime
          jsxOptions.importSource = undefined
          break
        case 'react-jsxdev':
          jsxOptions.development = true
        // eslint-disable-next-line no-fallthrough
        case 'react-jsx':
          jsxOptions.runtime = 'automatic'
          // these options should not be set when using automatic runtime
          jsxOptions.pragma = undefined
          typescriptOptions.jsxPragma = undefined
          jsxOptions.pragmaFrag = undefined
          typescriptOptions.jsxPragmaFrag = undefined
          break
        default:
          break
      }
    }

    oxcOptions.jsx = jsxOptions
    oxcOptions.typescript = typescriptOptions
  }

  if (oxcOptions.decorator?.legacy === undefined) {
    const experimentalDecorators = tsCompilerOptions.experimentalDecorators
    if (experimentalDecorators !== undefined) {
      oxcOptions.decorator ??= {}
      oxcOptions.decorator.legacy = experimentalDecorators
    }
    const emitDecoratorMetadata = tsCompilerOptions.emitDecoratorMetadata
    if (emitDecoratorMetadata !== undefined) {
      oxcOptions.decorator ??= {}
      oxcOptions.decorator.emitDecoratorMetadata = emitDecoratorMetadata
    }
  }

  /**
   * | preserveValueImports | importsNotUsedAsValues | verbatimModuleSyntax | onlyRemoveTypeImports |
   * | -------------------- | ---------------------- | -------------------- |---------------------- |
   * | false                | remove                 | false                | false                 |
   * | false                | preserve, error        | -                    | -                     |
   * | true                 | remove                 | -                    | -                     |
   * | true                 | preserve, error        | true                 | true                  |
   */
  if (oxcOptions.typescript?.onlyRemoveTypeImports === undefined) {
    if (tsCompilerOptions.verbatimModuleSyntax !== undefined) {
      oxcOptions.typescript ??= {}
      oxcOptions.typescript.onlyRemoveTypeImports =
        tsCompilerOptions.verbatimModuleSyntax
    } else if (
      tsCompilerOptions.preserveValueImports !== undefined ||
      tsCompilerOptions.importsNotUsedAsValues !== undefined
    ) {
      const preserveValueImports =
        tsCompilerOptions.preserveValueImports ?? false
      const importsNotUsedAsValues =
        tsCompilerOptions.importsNotUsedAsValues ?? 'remove'
      if (
        preserveValueImports === false &&
        importsNotUsedAsValues === 'remove'
      ) {
        oxcOptions.typescript ??= {}
        oxcOptions.typescript.onlyRemoveTypeImports = true
      } else if (
        preserveValueImports === true &&
        (importsNotUsedAsValues === 'preserve' ||
          importsNotUsedAsValues === 'error')
      ) {
        oxcOptions.typescript ??= {}
        oxcOptions.typescript.onlyRemoveTypeImports = false
      } else {
        warnings.push(
          `preserveValueImports=${preserveValueImports} + importsNotUsedAsValues=${importsNotUsedAsValues} is not supported by oxc.` +
          'Please migrate to the new verbatimModuleSyntax option.',
        )
        oxcOptions.typescript ??= {}
        oxcOptions.typescript.onlyRemoveTypeImports = false
      }
    }
  }

  const resolvedTsconfigTarget = resolveTsconfigTarget(tsCompilerOptions.target)
  const useDefineForClassFields =
    tsCompilerOptions.useDefineForClassFields ??
    (resolvedTsconfigTarget === 'next' || resolvedTsconfigTarget >= 2022)
  oxcOptions.assumptions ??= {}
  oxcOptions.assumptions.setPublicClassFields = !useDefineForClassFields
  oxcOptions.typescript ??= {}
  oxcOptions.typescript.removeClassFieldsWithoutInitializer =
    !useDefineForClassFields
}

export async function transformWithOxc(
  code: string,
  filename: string,
  options?: OxcTransformOptions,
  inMap?: object,
  config?: ResolvedConfig,
  watcher?: FSWatcher,
): Promise<Omit<OxcTransformResult, 'errors'> & { warnings: string[] }> {
  const warnings: string[] = []
  let lang = options?.lang

  if (!lang) {
    // if the id ends with a valid ext, use it (e.g. vue blocks)
    // otherwise, cleanup the query before checking the ext
    const ext = path
      .extname(validExtensionRE.test(filename) ? filename : cleanUrl(filename))
      .slice(1)

    if (ext === 'cjs' || ext === 'mjs') {
      lang = 'js'
    } else if (ext === 'cts' || ext === 'mts') {
      lang = 'ts'
    } else {
      lang = ext as 'js' | 'jsx' | 'ts' | 'tsx'
    }
  }

  const resolvedOptions = {
    sourcemap: true,
    ...options,
    lang,
  }

  if (lang === 'ts' || lang === 'tsx') {
    try {
      const { tsconfig: loadedTsconfig, tsconfigFile } =
        await loadTsconfigJsonForFile(filename, config)
      // tsconfig could be out of root, make sure it is watched on dev
      if (watcher && tsconfigFile && config) {
        ensureWatchedFile(watcher, tsconfigFile, config.root)
      }
      setOxcTransformOptionsFromTsconfigOptions(
        resolvedOptions,
        loadedTsconfig.compilerOptions,
        warnings,
      )
    } catch (e) {
      console.error(e)
      // TODO(kazupon): disable now, because 'tsconfck' package seem hard to resolve in browser environment
      // if (e instanceof TSConfckParseError) {
      //   // tsconfig could be out of root, make sure it is watched on dev
      //   if (watcher && e.tsconfigFile && config) {
      //     ensureWatchedFile(watcher, e.tsconfigFile, config.root)
      //   }
      // }
      throw e
    }
  }

  const result = { code: '', errors: [], helpersUsed: {} } as TransformOptions
  // TODO(kazupon): Use `transformSync` when oxc support browser environment
  // const result = transformSync(filename, code, resolvedOptions)

  if (result.errors.length > 0) {
    const firstError = result.errors[0]
    const error: RollupError = new Error(firstError.message)
    let frame = ''
    frame += firstError.labels
      .map(
        (l) =>
          (l.message ? `${l.message}\n` : '') +
          generateCodeFrame(code, l.start, l.end),
      )
      .join('\n')
    if (firstError.helpMessage) {
      frame += '\n' + firstError.helpMessage
    }
    error.frame = frame
    error.pos =
      firstError.labels.length > 0 ? firstError.labels[0].start : undefined
    throw error
  }

  let map: SourceMap
  if (inMap && result.map) {
    const nextMap = result.map
    nextMap.sourcesContent = []
    map = combineSourcemaps(filename, [
      nextMap as RawSourceMap,
      inMap as RawSourceMap,
    ]) as SourceMap
  } else {
    map = result.map as SourceMap
  }
  return {
    ...result,
    map,
    warnings,
  }
}

function resolveTsconfigTarget(target: string | undefined): number | 'next' {
  if (!target) return 5

  const targetLowered = target.toLowerCase()
  if (!targetLowered.startsWith('es')) return 5

  if (targetLowered === 'esnext') return 'next'
  return parseInt(targetLowered.slice(2))
}

// TODO: fill in codes ...

type OxcJsxOptions = Exclude<OxcOptions['jsx'], string | undefined>

export function convertEsbuildConfigToOxcConfig(
  esbuildConfig: ESBuildOptions,
  logger: Logger,
): OxcOptions {
  const { jsxInject, include, exclude, ...esbuildTransformOptions } =
    esbuildConfig

  const oxcOptions: OxcOptions = {
    jsxInject,
    include,
    exclude,
  }

  if (esbuildTransformOptions.jsx === 'preserve') {
    oxcOptions.jsx = 'preserve'
  } else {
    const jsxOptions: OxcJsxOptions = {}

    switch (esbuildTransformOptions.jsx) {
      case 'automatic':
        jsxOptions.runtime = 'automatic'
        if (esbuildTransformOptions.jsxImportSource) {
          jsxOptions.importSource = esbuildTransformOptions.jsxImportSource
        }
        break
      case 'transform':
        jsxOptions.runtime = 'classic'
        if (esbuildTransformOptions.jsxFactory) {
          jsxOptions.pragma = esbuildTransformOptions.jsxFactory
        }
        if (esbuildTransformOptions.jsxFragment) {
          jsxOptions.pragmaFrag = esbuildTransformOptions.jsxFragment
        }
        break
      default:
        break
    }

    if (esbuildTransformOptions.jsxDev !== undefined) {
      jsxOptions.development = esbuildTransformOptions.jsxDev
    }
    if (esbuildTransformOptions.jsxSideEffects !== undefined) {
      jsxOptions.pure = esbuildTransformOptions.jsxSideEffects
    }

    oxcOptions.jsx = jsxOptions
  }

  if (esbuildTransformOptions.define) {
    oxcOptions.define = esbuildTransformOptions.define
  }

  // these backward compat are supported by esbuildBannerFooterCompatPlugin
  if (esbuildTransformOptions.banner) {
    warnDeprecatedShouldBeConvertedToPluginOptions(logger, 'banner')
  }
  if (esbuildTransformOptions.footer) {
    warnDeprecatedShouldBeConvertedToPluginOptions(logger, 'footer')
  }

  return oxcOptions
}

function warnDeprecatedShouldBeConvertedToPluginOptions(
  logger: Logger,
  name: string,
) {
  logger.warn(
    colors.yellow(
      `\`esbuild.${name}\` option was specified. ` +
      `But this option is deprecated and will be removed in future versions. ` +
      'This option can be achieved by using a plugin with transform hook, please use that instead.',
    ),
  )
}
