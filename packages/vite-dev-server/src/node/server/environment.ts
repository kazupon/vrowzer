// TODO: fill in later

import { BaseEnvironment } from '../baseEnvironment'

// TODO: fill in later

import type { DepsOptimizer } from '../optimizer'

// TODO: fill in later

export class DevEnvironment extends BaseEnvironment {
  mode = 'dev' as const
  // TODO: implement!

  depsOptimizer?: DepsOptimizer

  // TODO: fill in later
}

// TODO: fill in later
