import type { UnknownEnvironment } from '../baseEnvironment.ts'
import type { BuildEnvironment } from '../build.ts'
import type { DevEnvironment } from '../environment.ts'

export type Environment =
  | DevEnvironment
  | BuildEnvironment
  // TODO(kazupon): add other environments
  // | /** @internal */ ScanEnvironment
  | UnknownEnvironment
