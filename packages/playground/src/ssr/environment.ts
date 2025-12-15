import type { PluginContext } from '@rolldown/browser'
import type { UnknownEnvironment } from '../baseEnvironment.ts'
import type { BuildEnvironment } from '../build.ts'
import type { DevEnvironment } from '../environment.ts'

export type Environment =
  | DevEnvironment
  | BuildEnvironment
  // TODO(kazupon): add other environments
  // | /** @internal */ ScanEnvironment
  | UnknownEnvironment

export function perEnvironmentState<State>(
  initial: (environment: Environment) => State
): (context: PluginContext) => State {
  const stateMap = new WeakMap<Environment, State>()
  return function (context: PluginContext) {
    const { environment } = context
    let state = stateMap.get(environment)
    if (!state) {
      state = initial(environment)
      stateMap.set(environment, state)
    }
    return state
  }
}
