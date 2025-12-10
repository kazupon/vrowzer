import type { SourceMap } from '@rolldown/browser'
import type { ModuleRunnerTransformOptions, TransformResult } from 'vite'

export async function ssrTransform(
  code: string,
  inMap: SourceMap | { mappings: '' } | null,
  url: string,
  originalCode: string,
  options?: ModuleRunnerTransformOptions
): Promise<TransformResult | null> {
  return null
  // TODO(kazupon): implement ssrTransform
  // if (options?.json?.stringify && isJSONRequest(url)) {
  //   return ssrTransformJSON(code, inMap)
  // }
  // return ssrTransformScript(code, inMap, url, originalCode)
}
