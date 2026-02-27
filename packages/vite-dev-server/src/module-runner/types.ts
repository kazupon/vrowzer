import type { ViteHotContext } from '#types/hot'

// TODO: fill in later ...

export interface ModuleRunnerImportMeta extends ImportMeta {
  url: string
  env: ImportMetaEnv
  hot?: ViteHotContext
  [key: string]: any
}

// TODO: fill in later ...
