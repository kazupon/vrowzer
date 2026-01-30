// TODO: fill in later ...

import type {
  SourceMap,
} from 'rolldown'

import {
  createDebugger,
  monotonicDateNow,
  removeTimestampQuery,
} from '../utils'

// TODO: fill in later ...

import type { DevEnvironment } from './environment'
import { throwClosedServerError } from './pluginContainer'

const debugLoad = createDebugger('vite:load')
const debugTransform = createDebugger('vite:transform')
const debugCache = createDebugger('vite:cache')

export interface TransformResult {
  code: string
  map: SourceMap | { mappings: '' } | null
  ssr?: boolean
  etag?: string
  deps?: string[]
  dynamicDeps?: string[]
}

export interface TransformOptions {
  /**
   * @deprecated inferred from environment
   */
  ssr?: boolean
}

export interface TransformOptionsInternal {
  /**
   * @internal
   */
  allowId?: (id: string) => boolean
}

// TODO: This function could be moved to the DevEnvironment class.
// It was already using private fields from the server before, and it now does
// the same with environment._closing, environment._pendingRequests and
// environment._registerRequestProcessing. Maybe it makes sense to keep it in
// separate file to preserve the history or keep the DevEnvironment class cleaner,
// but conceptually this is: `environment.transformRequest(url, options)`

export function transformRequest(
  environment: DevEnvironment,
  url: string,
  options: TransformOptionsInternal = {},
): Promise<TransformResult | null> {
  if (environment._closing && environment.config.dev.recoverable)
    throwClosedServerError()

  // This module may get invalidated while we are processing it. For example
  // when a full page reload is needed after the re-processing of pre-bundled
  // dependencies when a missing dep is discovered. We save the current time
  // to compare it to the last invalidation performed to know if we should
  // cache the result of the transformation or we should discard it as stale.
  //
  // A module can be invalidated due to:
  // 1. A full reload because of pre-bundling newly discovered deps
  // 2. A full reload after a config change
  // 3. The file that generated the module changed
  // 4. Invalidation for a virtual module
  //
  // For 1 and 2, a new request for this module will be issued after
  // the invalidation as part of the browser reloading the page. For 3 and 4
  // there may not be a new request right away because of HMR handling.
  // In all cases, the next time this module is requested, it should be
  // re-processed.
  //
  // We save the timestamp when we start processing and compare it with the
  // last time this module is invalidated
  const timestamp = monotonicDateNow()

  url = removeTimestampQuery(url)

  const pending = environment._pendingRequests.get(url)

  // TODO(kazupon): implement later ...
  return Promise.resolve(null)
}
// TODO: fill in later ...
