import type { PartialEnvironment } from './baseEnvironment'

// TODO: fill in later ...

export type ResolveIdFn = (
  environment: PartialEnvironment,
  id: string,
  importer?: string,
  aliasOnly?: boolean,
) => Promise<string | undefined>

// TODO: fill in later ...
