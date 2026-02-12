import type {
  Node as _Node
} from 'estree'
import type { SourceMap } from 'rolldown'
import { isJSONRequest } from '../plugins/json'
// NOTE(kazupon): keep the original codes, because we need to maintain forked codes from original codes later with LLMs.
// we need to use parseAst from @vrowser/oxc-parser
// import { parseAstAsync as rolldownParseAstAsync } from 'rolldown/parseAst'
import type { TransformResult } from '../server/transformRequest'

type Node = _Node & {
  start: number
  end: number
}

type OxcAstNode<T extends _Node> = T & {
  start: number
  end: number
}

export interface ModuleRunnerTransformOptions {
  json?: {
    stringify?: boolean
  }
}

export const ssrModuleExportsKey = `__vite_ssr_exports__`
export const ssrImportKey = `__vite_ssr_import__`
export const ssrDynamicImportKey = `__vite_ssr_dynamic_import__`
export const ssrExportAllKey = `__vite_ssr_exportAll__`
export const ssrExportNameKey = `__vite_ssr_exportName__`
export const ssrImportMetaKey = `__vite_ssr_import_meta__`

const hashbangRE = /^#!.*\n/

export async function ssrTransform(
  code: string,
  inMap: SourceMap | { mappings: '' } | null,
  url: string,
  originalCode: string,
  options?: ModuleRunnerTransformOptions,
): Promise<TransformResult | null> {
  if (options?.json?.stringify && isJSONRequest(url)) {
    return ssrTransformJSON(code, inMap)
  }
  return ssrTransformScript(code, inMap, url, originalCode)
}

async function ssrTransformJSON(
  code: string,
  inMap: SourceMap | { mappings: '' } | null,
): Promise<TransformResult> {
  return {
    code: code.replace('export default', `${ssrModuleExportsKey}.default =`),
    map: inMap,
    deps: [],
    dynamicDeps: [],
    ssr: true,
  }
}

async function ssrTransformScript(
  code: string,
  inMap: SourceMap | { mappings: '' } | null,
  url: string,
  originalCode: string,
): Promise<TransformResult | null> {
  // TODO(kazupon): implement later ...

  return {
    code,
    map: inMap,
    deps: [],
    dynamicDeps: [],
    ssr: true,
  }
}

// TODO: fill in code ...
