import colors from 'picocolors'
import { BaseEnvironment } from './baseEnvironment.ts'
import { ERR_OUTDATED_OPTIMIZED_DEP } from './constants.ts'
import { getShortName, normalizeHotChannel, updateModules } from './hrm.ts'
import { buildErrorMessage } from './middlewares/error.ts'
import { EnvironmentModuleGraph } from './moduleGraph.ts'
import { isDepOptimizationDisabled } from './optimizer/index.ts'
import { ERR_CLOSED_SERVER, createEnvironmentPluginContainer } from './pluginContainer.ts'
import { promiseWithResolvers } from './shared/utils.ts'
import { fetchModule } from './ssr/fetchModule.ts'
import { transformRequest } from './transformRequest.ts'
import { mergeConfig, monotonicDateNow } from './utils.ts'
import { warmupFiles } from './warmup.ts'
import { isWindowMessageHmrServer } from './wm.ts'

import type {
  EnvironmentModuleNode,
  EnvironmentOptions,
  FSWatcher,
  HotChannel,
  NormalizedHotChannel,
  ResolvedConfig,
  TransformResult,
  ViteDevServer
} from 'vite'
import type { FetchFunctionOptions, FetchResult } from 'vite/module-runner'
import type { ResolvedEnvironmentOptions } from './config.ts'
import type { DepsOptimizer } from './optimizer/index.ts'
import type { EnvironmentPluginContainer } from './pluginContainer.ts'
import type { TransformOptionsInternal } from './transformRequest.ts'
import type { WindowMessageHmrServer } from './wm.ts'

// ---

export interface DevEnvironmentContext {
  hot: boolean
  // NOTE(kazupon): transport?: HotChannel | WebSocketServer
  transport?: HotChannel | WindowMessageHmrServer
  options?: EnvironmentOptions
  remoteRunner?: {
    inlineSourceMap?: boolean
  }
  depsOptimizer?: DepsOptimizer
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
      throw new Error(`${this.name} environment.pluginContainer called before initialized`)
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
  _crawlEndFinder: CrawlEndFinder

  /**
   * Hot channel for this environment. If not provided or disabled,
   * it will be a noop channel that does nothing.
   *
   * @example
   * environment.hot.send({ type: 'full-reload' })
   */
  hot: NormalizedHotChannel
  constructor(name: string, config: ResolvedConfig, context: DevEnvironmentContext) {
    let options = config.environments[name]
    if (!options) {
      throw new Error(`Environment "${name}" is not defined in the config.`)
    }
    if (context.options) {
      options = mergeConfig(options, context.options) as ResolvedEnvironmentOptions
    }
    // @ts-expect-error -- FIXME(kazupon): types
    super(name, config, options)

    this._pendingRequests = new Map()

    this.moduleGraph = new EnvironmentModuleGraph(name, (url: string) =>
      this.pluginContainer.resolveId(url, undefined)
    )

    this._crawlEndFinder = setupOnCrawlEnd()

    this._remoteRunnerOptions = context.remoteRunner ?? {}

    this.hot = context.transport
      ? // NOTE(kazupon):
        // ? isWebSocketServer in context.transport
        isWindowMessageHmrServer in context.transport
        ? context.transport
        : normalizeHotChannel(context.transport, context.hot)
      : normalizeHotChannel({}, context.hot)

    // @ts-expect-error -- FIXME(kazupon): internal types
    this.hot.setInvokeHandler({
      // @ts-expect-error -- FIXME(kazupon): types
      fetchModule: (id, importer, options) => {
        return this.fetchModule(id, importer, options)
      },
      getBuiltins: async () => {
        return this.config.resolve.builtins.map(builtin =>
          typeof builtin === 'string'
            ? { type: 'string', value: builtin }
            : { type: 'RegExp', source: builtin.source, flags: builtin.flags }
        )
      }
    })

    this.hot.on('vite:invalidate', async ({ path, message, firstInvalidatedBy }) => {
      invalidateModule(this, {
        path,
        message,
        firstInvalidatedBy
      })
    })

    const { optimizeDeps } = this.config
    if (context.depsOptimizer) {
      this.depsOptimizer = context.depsOptimizer
    } else if (isDepOptimizationDisabled(optimizeDeps)) {
      this.depsOptimizer = undefined
    } else {
      this.depsOptimizer = undefined
      // TODO(kazupon): we need sync web standard crypto API
      // this.depsOptimizer = (
      //   optimizeDeps.noDiscovery
      //     ? createExplicitDepsOptimizer
      //     : createDepsOptimizer
      // )(this)
    }
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
      options?.watcher
    )
  }

  /**
   * When the dev server is restarted, the methods are called in the following order:
   * - new instance `init`
   * - previous instance `close`
   * - new instance `listen`
   */
  async listen(server: ViteDevServer): Promise<void> {
    this.hot.listen()
    await this.depsOptimizer?.init()
    warmupFiles(server, this)
  }

  fetchModule(id: string, importer?: string, options?: FetchFunctionOptions): Promise<FetchResult> {
    return fetchModule(this, id, importer, {
      ...this._remoteRunnerOptions,
      ...options
    })
  }

  async reloadModule(module: EnvironmentModuleNode): Promise<void> {
    if (this.config.server.hmr !== false && module.file) {
      updateModules(this, module.file, [module], monotonicDateNow())
    }
  }

  transformRequest(
    url: string,
    /** @internal */
    options?: TransformOptionsInternal
  ): Promise<TransformResult | null> {
    return transformRequest(this, url, options)
  }

  async warmupRequest(url: string): Promise<void> {
    try {
      await this.transformRequest(url)
    } catch (e) {
      if (
        // @ts-expect-error -- FIXME(kazupon): types
        e?.code === ERR_OUTDATED_OPTIMIZED_DEP ||
        // @ts-expect-error -- FIXME(kazupon): types
        e?.code === ERR_CLOSED_SERVER
      ) {
        // these are expected errors
        return
      }
      // Unexpected error, log the issue but avoid an unhandled exception
      this.logger.error(
        // @ts-expect-error -- FIXME(kazupon): types
        buildErrorMessage(e, [`Pre-transform error: ${e.message}`], false),
        {
          // @ts-expect-error -- FIXME(kazupon): types
          error: e,
          timestamp: true
        }
      )
    }
  }

  async close(): Promise<void> {
    this._closing = true

    this._crawlEndFinder.cancel()
    await Promise.allSettled([
      this.pluginContainer.close(),
      this.depsOptimizer?.close(),
      // WebSocketServer is independent of HotChannel and should not be closed on environment close
      // isWebSocketServer in this.hot ? Promise.resolve() : this.hot.close(),
      isWindowMessageHmrServer in this.hot ? Promise.resolve() : this.hot.close(),
      (async () => {
        while (this._pendingRequests.size > 0) {
          await Promise.allSettled(
            [...this._pendingRequests.values()].map(pending => pending.request)
          )
        }
      })()
    ])
  }

  /**
   * Calling `await environment.waitForRequestsIdle(id)` will wait until all static imports
   * are processed after the first transformRequest call. If called from a load or transform
   * plugin hook, the id needs to be passed as a parameter to avoid deadlocks.
   * Calling this function after the first static imports section of the module graph has been
   * processed will resolve immediately.
   * @experimental
   */
  waitForRequestsIdle(ignoredId?: string): Promise<void> {
    return this._crawlEndFinder.waitForRequestsIdle(ignoredId)
  }

  /**
   * @internal
   */
  _registerRequestProcessing(id: string, done: () => Promise<unknown>): void {
    this._crawlEndFinder.registerRequestProcessing(id, done)
  }
}

function invalidateModule(
  environment: DevEnvironment,
  m: {
    path: string
    message?: string
    firstInvalidatedBy: string
  }
) {
  const mod = environment.moduleGraph.urlToModuleMap.get(m.path)
  if (mod && mod.isSelfAccepting && mod.lastHMRTimestamp > 0 && !mod.lastHMRInvalidationReceived) {
    mod.lastHMRInvalidationReceived = true
    environment.logger.info(
      colors.yellow(`hmr invalidate `) + colors.dim(m.path) + (m.message ? ` ${m.message}` : ''),
      { timestamp: true }
    )
    const file = getShortName(mod.file!, environment.config.root)
    updateModules(
      environment,
      file,
      [...mod.importers].filter(imp => imp !== mod), // ignore self-imports
      mod.lastHMRTimestamp,
      m.firstInvalidatedBy
    )
  }
}

const callCrawlEndIfIdleAfterMs = 50

interface CrawlEndFinder {
  registerRequestProcessing: (id: string, done: () => Promise<any>) => void
  waitForRequestsIdle: (ignoredId?: string) => Promise<void>
  cancel: () => void
}

function setupOnCrawlEnd(): CrawlEndFinder {
  const registeredIds = new Set<string>()
  const seenIds = new Set<string>()
  const onCrawlEndPromiseWithResolvers = promiseWithResolvers<void>()

  let timeoutHandle: NodeJS.Timeout | undefined

  let cancelled = false
  function cancel() {
    cancelled = true
  }

  function registerRequestProcessing(id: string, done: () => Promise<any>): void {
    if (!seenIds.has(id)) {
      seenIds.add(id)
      registeredIds.add(id)
      done()
        .catch(() => {})
        .finally(() => markIdAsDone(id))
    }
  }

  function waitForRequestsIdle(ignoredId?: string): Promise<void> {
    if (ignoredId) {
      seenIds.add(ignoredId)
      markIdAsDone(ignoredId)
    } else {
      checkIfCrawlEndAfterTimeout()
    }
    return onCrawlEndPromiseWithResolvers.promise
  }

  function markIdAsDone(id: string): void {
    registeredIds.delete(id)
    checkIfCrawlEndAfterTimeout()
  }

  function checkIfCrawlEndAfterTimeout() {
    if (cancelled || registeredIds.size > 0) return

    if (timeoutHandle) clearTimeout(timeoutHandle)
    timeoutHandle = setTimeout(callOnCrawlEndWhenIdle, callCrawlEndIfIdleAfterMs)
  }
  async function callOnCrawlEndWhenIdle() {
    if (cancelled || registeredIds.size > 0) return
    onCrawlEndPromiseWithResolvers.resolve()
  }

  return {
    registerRequestProcessing,
    waitForRequestsIdle,
    cancel
  }
}
