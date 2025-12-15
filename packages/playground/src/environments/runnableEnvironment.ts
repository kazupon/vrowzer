import { DevEnvironment } from '../environment.ts'
import { createServerHotChannel } from '../hrm.ts'
import { createServerModuleRunner } from '../ssr/runtime/serverModuleRunner.ts'

import type { ResolvedConfig, RunnableDevEnvironmentContext, ServerModuleRunnerOptions } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'
import type { DevEnvironmentContext } from '../environment.ts'

export function createRunnableDevEnvironment(
  name: string,
  config: ResolvedConfig,
  context: RunnableDevEnvironmentContext = {}
): RunnableDevEnvironment {
  if (context.transport == null) {
    context.transport = createServerHotChannel()
  }
  if (context.hot == null) {
    context.hot = true
  }

  return new RunnableDevEnvironment(name, config, context)
}

class RunnableDevEnvironment extends DevEnvironment {
  private _runner: ModuleRunner | undefined
  private _runnerFactory:
    | ((environment: RunnableDevEnvironment, options?: ServerModuleRunnerOptions) => ModuleRunner)
    | undefined
  private _runnerOptions: ServerModuleRunnerOptions | undefined

  constructor(name: string, config: ResolvedConfig, context: RunnableDevEnvironmentContext) {
    super(name, config, context as DevEnvironmentContext)
    // TODO(kazupon): allow passing runner factory and options via context
    this._runnerFactory = context.runner
    this._runnerOptions = context.runnerOptions
  }

  get runner(): ModuleRunner {
    if (this._runner) {
      return this._runner
    }
    const factory = this._runnerFactory || createServerModuleRunner
    this._runner = factory(this, this._runnerOptions)
    return this._runner
  }

  override async close(): Promise<void> {
    await super.close()
    if (this._runner) {
      await this._runner.close()
    }
  }
}

// ---
