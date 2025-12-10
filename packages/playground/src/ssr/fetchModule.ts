import { pathToFileURL } from 'mlly'
import { MODULE_RUNNER_SOURCEMAPPING_SOURCE, SOURCEMAPPING_URL } from '../constants.ts'
import { tryNodeResolve } from '../plugins/resolve.ts'
import { unwrapId } from '../shared/utils.ts'
import { genSourceMapUrl } from '../sourcemap.ts'
import { isBuiltin, isExternalUrl, isFilePathESM } from '../utils.ts'

import type { EnvironmentModuleNode, FetchModuleOptions, TransformResult } from 'vite'
import type { FetchResult } from 'vite/module-runner'
import type { DevEnvironment } from '../environment.ts'

/**
 * Fetch module information for Vite runner.
 * @experimental
 */
export async function fetchModule(
  environment: DevEnvironment,
  url: string,
  importer?: string,
  options: FetchModuleOptions = {}
): Promise<FetchResult> {
  if (url.startsWith('data:') || isBuiltin(environment.config.resolve.builtins, url)) {
    return { externalize: url, type: 'builtin' }
  }

  // handle file urls from not statically analyzable dynamic import
  const isFileUrl = url.startsWith('file://')

  if (isExternalUrl(url) && !isFileUrl) {
    return { externalize: url, type: 'network' }
  }

  // if there is no importer, the file is an entry point
  // entry points are always internalized
  if (!isFileUrl && importer && url[0] !== '.' && url[0] !== '/') {
    const { isProduction, root } = environment.config
    const { externalConditions, dedupe, preserveSymlinks } = environment.config.resolve

    const resolved = tryNodeResolve(url, importer, {
      mainFields: ['main'],
      conditions: externalConditions,
      externalConditions,
      external: [],
      noExternal: [],
      extensions: ['.js', '.cjs', '.json'],
      dedupe,
      preserveSymlinks,
      tsconfigPaths: false,
      isBuild: false,
      isProduction,
      root,
      // @ts-expect-error -- FIXME(kazupon): types
      packageCache: environment.config.packageCache,
      builtins: environment.config.resolve.builtins
    })
    if (!resolved) {
      const err: any = new Error(`Cannot find module '${url}' imported from '${importer}'`)
      err.code = 'ERR_MODULE_NOT_FOUND'
      throw err
    }
    const file = pathToFileURL(resolved.id).toString()
    // @ts-expect-error -- FIXME(kazupon): types
    const type = isFilePathESM(resolved.id, environment.config.packageCache) ? 'module' : 'commonjs'
    return { externalize: file, type }
  }

  url = unwrapId(url)

  const mod = await environment.moduleGraph.ensureEntryFromUrl(url)
  const cached = !!mod.transformResult

  // if url is already cached, we can just confirm it's also cached on the server
  if (options.cached && cached) {
    return { cache: true }
  }

  let result = await environment.transformRequest(url)

  if (!result) {
    throw new Error(
      `[vite] transform failed for module '${url}'${
        importer ? ` imported from '${importer}'` : ''
      }.`
    )
  }

  if (options.inlineSourceMap !== false) {
    result = inlineSourceMap(mod, result, options.startOffset)
  }

  // remove shebang
  if (result.code[0] === '#') result.code = result.code.replace(/^#!.*/, s => ' '.repeat(s.length))

  return {
    code: result.code,
    file: mod.file,
    id: mod.id!,
    url: mod.url,
    invalidate: !cached
  }
}

const OTHER_SOURCE_MAP_REGEXP = new RegExp(
  `//# ${SOURCEMAPPING_URL}=data:application/json[^,]+base64,([A-Za-z0-9+/=]+)$`,
  'gm'
)

function inlineSourceMap(
  mod: EnvironmentModuleNode,
  result: TransformResult,
  startOffset: number | undefined
) {
  const map = result.map
  let code = result.code

  if (!map || !('version' in map) || code.includes(MODULE_RUNNER_SOURCEMAPPING_SOURCE))
    return result

  // to reduce the payload size, we only inline vite node source map, because it's also the only one we use
  OTHER_SOURCE_MAP_REGEXP.lastIndex = 0
  if (OTHER_SOURCE_MAP_REGEXP.test(code)) code = code.replace(OTHER_SOURCE_MAP_REGEXP, '')

  const sourceMap = startOffset
    ? Object.assign({}, map, {
        mappings: ';'.repeat(startOffset) + map.mappings
      })
    : map
  result.code = `${code.trimEnd()}\n//# sourceURL=${
    mod.id
  }\n${MODULE_RUNNER_SOURCEMAPPING_SOURCE}\n//# ${SOURCEMAPPING_URL}=${genSourceMapUrl(sourceMap)}\n`

  return result
}
