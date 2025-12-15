import { createEnvironmentPluginContainer } from './pluginContainer.ts'

import type { PartialResolvedId } from '@rolldown/browser'
import type { InternalResolveOptions, ResolvedConfig } from 'vite'
import type { PartialEnvironment } from './baseEnvironment.ts'
import type { EnvironmentPluginContainer } from './pluginContainer.ts'
import type { Environment } from './ssr/environment.ts'

type ResolveIdFn = (
  environment: PartialEnvironment,
  id: string,
  importer?: string,
  aliasOnly?: boolean
) => Promise<string | undefined>

/**
 * Some projects like Astro were overriding config.createResolver to add a custom
 * alias plugin. For the client and ssr environments, we root through it to avoid
 * breaking changes for now.
 */
function createBackCompatIdResolver(
  config: ResolvedConfig,
  options?: Partial<InternalResolveOptions>
): ResolveIdFn {
  const compatResolve = config.createResolver(options)
  let resolve: ResolveIdFn
  return async (environment, id, importer, aliasOnly) => {
    if (environment.name === 'client' || environment.name === 'ssr') {
      return compatResolve(id, importer, aliasOnly, environment.name === 'ssr')
    }
    resolve ??= createIdResolver(config, options)
    return resolve(environment, id, importer, aliasOnly)
  }
}

/**
 * Create an internal resolver to be used in special scenarios, e.g.
 * optimizer and handling css @imports
 */
export function createIdResolver(
  config: ResolvedConfig,
  options?: Partial<InternalResolveOptions>
): ResolveIdFn {
  const scan = options?.scan

  const pluginContainerMap = new Map<PartialEnvironment, EnvironmentPluginContainer>()
  async function resolve(
    environment: PartialEnvironment,
    id: string,
    importer?: string
  ): Promise<PartialResolvedId | null> {
    let pluginContainer = pluginContainerMap.get(environment)
    if (!pluginContainer) {
      pluginContainer = await createEnvironmentPluginContainer(
        environment as Environment,
        [
          // @ts-expect-error  the aliasPlugin uses rollup types
          //aliasPlugin({ entries: environment.config.resolve.alias }),
          //...(config.experimental.enableNativePlugin
          //  ? oxcResolvePlugin(
          //    {
          //      root: config.root,
          //      isProduction: config.isProduction,
          //      isBuild: config.command === 'build',
          //      asSrc: true,
          //      preferRelative: false,
          //      tryIndex: true,
          //      ...options,
          //      // Ignore sideEffects and other computations as we only need the id
          //      idOnly: true,
          //    },
          //    environment.config,
          //  )
          //  : [
          //    resolvePlugin({
          //      root: config.root,
          //      isProduction: config.isProduction,
          //      isBuild: config.command === 'build',
          //      asSrc: true,
          //      preferRelative: false,
          //      tryIndex: true,
          //      ...options,
          //      // Ignore sideEffects and other computations as we only need the id
          //      idOnly: true,
          //    }),
          //  ]),
        ],
        undefined,
        false
      )
      pluginContainerMap.set(environment, pluginContainer)
    }
    return await pluginContainer.resolveId(id, importer, { scan })
  }

  const aliasOnlyPluginContainerMap = new Map<PartialEnvironment, EnvironmentPluginContainer>()
  async function resolveAlias(
    environment: PartialEnvironment,
    id: string,
    importer?: string
  ): Promise<PartialResolvedId | null> {
    let pluginContainer = aliasOnlyPluginContainerMap.get(environment)
    if (!pluginContainer) {
      pluginContainer = await createEnvironmentPluginContainer(
        environment as Environment,
        // @ts-expect-error  the aliasPlugin uses rollup types
        [aliasPlugin({ entries: environment.config.resolve.alias })],
        undefined,
        false
      )
      aliasOnlyPluginContainerMap.set(environment, pluginContainer)
    }
    return await pluginContainer.resolveId(id, importer, { scan })
  }

  return async (environment, id, importer, aliasOnly) => {
    const resolveFn = aliasOnly ? resolveAlias : resolve
    // aliasPlugin and resolvePlugin are implemented to function with a Environment only,
    // we cast it as PluginEnvironment to be able to use the pluginContainer
    const resolved = await resolveFn(environment, id, importer)
    return resolved?.id
  }
}
