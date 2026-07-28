import type { ModuleEvaluator, ModuleRunnerOptions } from './types'

export class ModuleRunner {
  constructor(
    public options: ModuleRunnerOptions,
    public evaluator?: ModuleEvaluator,
  ) {}

  async close(): Promise<void> {
    await this.options.transport.disconnect?.()
  }
}
