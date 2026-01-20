// TODO: fill in later ...

import type {
  SourceMap,
} from 'rolldown'

// TODO: fill in later ...

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

// TODO: fill in later ...
