
// TODO: fill in later ...

import { BaseEnvironment } from '../baseEnvironment'
import type { EnvironmentPluginContainer } from '../server/pluginContainer'
import { createEnvironmentPluginContainer } from '../server/pluginContainer'

// TODO: fill in later ...

export class ScanEnvironment extends BaseEnvironment {
  mode = 'scan' as const

  get pluginContainer(): EnvironmentPluginContainer {
    if (!this._pluginContainer)
      throw new Error(
        `${this.name} environment.pluginContainer called before initialized`,
      )
    return this._pluginContainer
  }
  /**
   * @internal
   */
  _pluginContainer: EnvironmentPluginContainer | undefined

  async init(): Promise<void> {
    if (this._initiated) {
      return
    }
    this._initiated = true
    this._pluginContainer = await createEnvironmentPluginContainer(
      this,
      this.plugins,
      undefined,
      false,
    )
  }
}

// TODO: fill in later ...
