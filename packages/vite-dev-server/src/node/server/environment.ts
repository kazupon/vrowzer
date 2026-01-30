// TODO: fill in later

import { BaseEnvironment } from '../baseEnvironment'

import type { FSWatcher } from '#dep-types/chokidar'
import type {
  EnvironmentOptions,
  ResolvedConfig,
  ResolvedEnvironmentOptions,
} from '../config'
import { mergeConfig } from '../utils'

import { transformRequest } from './transformRequest'

// TODO: fill in later

import type { DepsOptimizer } from '../optimizer'

import { EnvironmentModuleGraph } from './moduleGraph'

import type { EnvironmentPluginContainer } from './pluginContainer'
import {
  createEnvironmentPluginContainer
} from './pluginContainer'

// TODO: fill in later ...

import type { HotChannel, NormalizedHotChannel } from './hmr'

// TODO: fill in later

import type {
  TransformOptionsInternal,
  TransformResult,
} from './transformRequest'

// TODO: fill in later

import type { MessageChannelServer } from './ws'

export interface DevEnvironmentContext {
  hot: boolean
  transport?: HotChannel | MessageChannelServer
  // NOTE(kazupon): comment out because we need to undserstand the previous implementation as background
  // transport?: HotChannel | WebSocketServer
  options?: EnvironmentOptions
  remoteRunner?: {
    inlineSourceMap?: boolean
  }
  depsOptimizer?: DepsOptimizer
  /** @internal used for full bundle mode */
  disableDepsOptimizer?: boolean
}

export class DevEnvironment extends BaseEnvironment {
  mode = 'dev' as const
  moduleGraph: EnvironmentModuleGraph

  depsOptimizer?: DepsOptimizer
  /**
   * @internal
   */
  _remoteRunnerOptions: DevEnvironmentContext['remoteRunner']

  get pluginContainer(): EnvironmentPluginContainer<DevEnvironment> {
    if (!this._pluginContainer)
      throw new Error(
        `${this.name} environment.pluginContainer called before initialized`,
      )
    return this._pluginContainer
  }
  /**
   * @internal
   */
  _pluginContainer: EnvironmentPluginContainer<DevEnvironment> | undefined

  /**
   * @internal
   */
  _closing: boolean = false

  /**
   * @internal
   */
  _pendingRequests: Map<
    string,
    {
      request: Promise<TransformResult | null>
      timestamp: number
      abort: () => void
    }
  >
  /**
   * @internal
   */
  // NOTE(kazupon): enable later ...
  //  _crawlEndFinder: CrawlEndFinder

  /**
   * Hot channel for this environment. If not provided or disabled,
   * it will be a noop channel that does nothing.
   *
   * @example
   * environment.hot.send({ type: 'full-reload' })
   */
  hot: NormalizedHotChannel
  constructor(
    name: string,
    config: ResolvedConfig,
    context: DevEnvironmentContext,
  ) {
    let options = config.environments[name]
    if (!options) {
      throw new Error(`Environment "${name}" is not defined in the config.`)
    }
    if (context.options) {
      options = mergeConfig(
        options,
        context.options,
      ) as ResolvedEnvironmentOptions
    }
    super(name, config, options)

    this._pendingRequests = new Map()

    this.moduleGraph = new EnvironmentModuleGraph(name, (url: string) =>
      this.pluginContainer!.resolveId(url, undefined),
    )

    /* NOTE(kazupon): enable later ...
    this._crawlEndFinder = setupOnCrawlEnd()

    this._remoteRunnerOptions = context.remoteRunner ?? {}

    this.hot = context.transport
      ? isMessageChannelServer in context.transport
        ? context.transport
        : normalizeHotChannel(context.transport, context.hot)
      : normalizeHotChannel({}, context.hot)

    this.hot.setInvokeHandler({
      fetchModule: (id, importer, options) => {
        return this.fetchModule(id, importer, options)
      },
      getBuiltins: async () => {
        return this.config.resolve.builtins.map((builtin) =>
          typeof builtin === 'string'
            ? { type: 'string', value: builtin }
            : { type: 'RegExp', source: builtin.source, flags: builtin.flags },
        )
      },
    })

    this.hot.on(
      'vite:invalidate',
      async ({ path, message, firstInvalidatedBy }, client) => {
        this.invalidateModule(
          {
            path,
            message,
            firstInvalidatedBy,
          },
          client,
        )
      },
    )

    if (!context.disableDepsOptimizer) {
      const { optimizeDeps } = this.config
      if (context.depsOptimizer) {
        this.depsOptimizer = context.depsOptimizer
      } else if (isDepOptimizationDisabled(optimizeDeps)) {
        this.depsOptimizer = undefined
      } else {
        this.depsOptimizer = (
          optimizeDeps.noDiscovery
            ? createExplicitDepsOptimizer
            : createDepsOptimizer
        )(this)
      }
    }
    */
  }

  async init(options?: {
    watcher?: FSWatcher
    /**
     * the previous instance used for the environment with the same name
     *
     * when using, the consumer should check if it's an instance generated from the same class or factory function
     */
    previousInstance?: DevEnvironment
  }): Promise<void> {
    if (this._initiated) {
      return
    }
    this._initiated = true
    this._pluginContainer = await createEnvironmentPluginContainer(
      this,
      this.config.plugins,
      options?.watcher,
    )
  }

  // TODO: fill in later

  // async reloadModule(module: EnvironmentModuleNode): Promise<void> {
  //   if (this.config.server.hmr !== false && module.file) {
  //     updateModules(this, module.file, [module], monotonicDateNow())
  //   }
  // }

  transformRequest(
    url: string,
    /** @internal */
    options?: TransformOptionsInternal,
  ): Promise<TransformResult | null> {
    return transformRequest(this, url, options)
  }

  // TODO: fill in later
}

// TODO: fill in later
