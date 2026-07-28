import type { ViteHotContext } from '#types/hot'
import type { HMRLogger } from '../shared/hmr'
import type { ModuleRunnerTransport } from '../shared/moduleRunnerTransport'

export interface ModuleRunnerImportMeta {
  url: string
  env: ImportMetaEnv
  hot?: ViteHotContext
  dirname: string
  filename: string
  glob: (...args: any[]) => any
  resolve(specifier: string, parent?: string): string
  [key: string]: any
}

export interface ModuleEvaluator {
  runInlinedModule(
    context: Record<PropertyKey, unknown>,
    code: string,
    module: Readonly<{ id: string }>,
  ): Promise<any>
  runExternalModule(file: string): Promise<any>
}

export interface ModuleRunnerHmr {
  logger?: false | HMRLogger
}

export interface SourcemapInterceptor {
  retrieveFile?: (id: string) => string | undefined
}

export interface ModuleRunnerOptions {
  transport: ModuleRunnerTransport
  sourcemapInterceptor?:
    | false
    | 'node'
    | 'prepareStackTrace'
    | SourcemapInterceptor
  hmr?: boolean | ModuleRunnerHmr
  createImportMeta?: (
    modulePath: string,
  ) => ModuleRunnerImportMeta | Promise<ModuleRunnerImportMeta>
}

export interface ImportMetaEnv {
  [key: string]: any
  BASE_URL: string
  MODE: string
  DEV: boolean
  PROD: boolean
  SSR: boolean
}
