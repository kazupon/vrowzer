import type {
  CustomPluginOptions,
  InputOptions,
  LoadResult,
  ModuleInfo,
  PartialResolvedId,
  Plugin,
  SourceDescription,
  SourceMap
} from '@rolldown/browser'
import type { DevEnvironment, Environment } from 'vite'

type SkipInformation = {
  id: string
  importer: string | undefined
  plugin: Plugin
  called?: boolean
}

// Backward compatibility
class PluginContainer {
  environments: Record<string, Environment>

  constructor(environments: Record<string, Environment>) {
    this.environments = environments
  }

  // Backward compatibility
  // Users should call pluginContainer.resolveId (and load/transform) passing the environment they want to work with
  // But there is code that is going to call it without passing an environment, or with the ssr flag to get the ssr environment
  private _getEnvironment(options?: { ssr?: boolean; environment?: Environment }) {
    return options?.environment
      ? options.environment
      : this.environments[options?.ssr ? 'ssr' : 'client']
  }

  private _getPluginContainer(options?: { ssr?: boolean; environment?: Environment }) {
    return (this._getEnvironment(options) as DevEnvironment).pluginContainer
  }

  getModuleInfo(id: string): ModuleInfo | null {
    const clientModuleInfo = (
      this.environments.client as DevEnvironment
    ).pluginContainer.getModuleInfo(id)
    const ssrModuleInfo = (this.environments.ssr as DevEnvironment).pluginContainer.getModuleInfo(
      id
    )

    if (clientModuleInfo == null && ssrModuleInfo == null) return null

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- NOTE: any proxy
    return new Proxy({} as any, {
      get: (_, key: string) => {
        // `meta` refers to `ModuleInfo.meta` of both environments, so we also
        // need to merge it here
        if (key === 'meta') {
          const meta: Record<string, any> = {}
          if (ssrModuleInfo) {
            Object.assign(meta, ssrModuleInfo.meta)
          }
          if (clientModuleInfo) {
            Object.assign(meta, clientModuleInfo.meta)
          }
          return meta
        }
        if (clientModuleInfo) {
          if (key in clientModuleInfo) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- NOTE: any proxy
            return clientModuleInfo[key as keyof ModuleInfo]
          }
        }
        if (ssrModuleInfo) {
          if (key in ssrModuleInfo) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- NOTE: any proxy
            return ssrModuleInfo[key as keyof ModuleInfo]
          }
        }
      }
    })
  }

  get options(): InputOptions {
    return (this.environments.client as DevEnvironment).pluginContainer.options
  }

  // For backward compatibility, buildStart and watchChange are called only for the client environment
  // buildStart is called per environment for a plugin with the perEnvironmentStartEndDuringDev flag
  // watchChange is called per environment for a plugin with the perEnvironmentWatchChangeDuringDev flag

  async buildStart(_options?: InputOptions): Promise<void> {
    return (this.environments.client as DevEnvironment).pluginContainer.buildStart(_options)
  }

  async watchChange(id: string, change: { event: 'create' | 'update' | 'delete' }): Promise<void> {
    return (this.environments.client as DevEnvironment).pluginContainer.watchChange(id, change)
  }

  async resolveId(
    rawId: string,
    importer?: string,
    options?: {
      attributes?: Record<string, string>
      custom?: CustomPluginOptions
      /** @deprecated use `skipCalls` instead */
      skip?: Set<Plugin>
      skipCalls?: readonly SkipInformation[]
      ssr?: boolean
      /**
       * @internal
       */
      scan?: boolean
      isEntry?: boolean
    }
  ): Promise<PartialResolvedId | null> {
    // @ts-expect-error -- FIX(kazupon): types
    return this._getPluginContainer(options).resolveId(rawId, importer, options)
  }

  async load(
    id: string,
    options?: {
      ssr?: boolean
    }
  ): Promise<LoadResult | null> {
    return this._getPluginContainer(options).load(id)
  }

  async transform(
    code: string,
    id: string,
    options?: {
      ssr?: boolean
      environment?: Environment
      inMap?: SourceDescription['map']
    }
  ): Promise<{ code: string; map: SourceMap | { mappings: '' } | null }> {
    return this._getPluginContainer(options).transform(code, id, options)
  }

  async close(): Promise<void> {
    // noop, close will be called for each environment
  }
}

/**
 * server.pluginContainer compatibility
 *
 * The default environment is in buildStart, buildEnd, watchChange, and closeBundle hooks,
 * which are called once for all environments, or when no environment is passed in other hooks.
 * The ssrEnvironment is needed for backward compatibility when the ssr flag is passed without
 * an environment. The defaultEnvironment in the main pluginContainer in the server should be
 * the client environment for backward compatibility.
 **/
export function createPluginContainer(environments: Record<string, Environment>): PluginContainer {
  return new PluginContainer(environments)
}
