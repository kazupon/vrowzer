import aliasPlugin from '@rollup/plugin-alias'
import { init as initOxcParser } from '@vrowser/oxc-parser'
import type { PartialResolvedId } from 'rolldown'
import type { PartialEnvironment } from './baseEnvironment'
import type { ResolvedConfig } from './config'
import type { Environment } from './environment'
import type { InternalResolveOptions } from './plugins/resolve'
import { oxcResolvePlugin, resolvePlugin } from './plugins/resolve'
import type { EnvironmentPluginContainer } from './server/pluginContainer'
import { createEnvironmentPluginContainer } from './server/pluginContainer'

// TODO: fill in later ...

export type ResolveIdFn = (
  environment: PartialEnvironment,
  id: string,
  importer?: string,
  aliasOnly?: boolean,
) => Promise<string | undefined>

// TODO: fill in later ...

/**
 * Create an internal resolver to be used in special scenarios, e.g.
 * optimizer and handling css @imports
 */
export function createIdResolver(
  config: ResolvedConfig,
  options?: Partial<InternalResolveOptions>,
): ResolveIdFn {
  const scan = options?.scan

  const pluginContainerMap = new Map<
    PartialEnvironment,
    EnvironmentPluginContainer
  >()
  async function resolve(
    environment: PartialEnvironment,
    id: string,
    importer?: string,
  ): Promise<PartialResolvedId | null> {
    let pluginContainer = pluginContainerMap.get(environment)
    if (!pluginContainer) {
      // NOTE(kazupon): we need to initialize `@vrowser/oxc-parser` here, because it requires to load oxc-parser wasm before using `parseSync`
      // WASM URL is handled by the build pipeline:
      // - Dev mode: createWasmInlinePlugin inlines WASM as base64 data URL
      // - Production: createWasmInlinePlugin also inlines WASM in the bundled SW
      // No explicit URL is needed; the wasm-bindgen default URL mechanism is used.
      await initOxcParser()
      pluginContainer = await createEnvironmentPluginContainer(
        environment as Environment,
        [
          // @ts-expect-error  the aliasPlugin uses rollup types
          aliasPlugin({ entries: environment.config.resolve.alias }),
          ...(config.experimental.enableNativePlugin
            ? oxcResolvePlugin(
              {
                root: config.root,
                isProduction: config.isProduction,
                isBuild: config.command === 'build',
                asSrc: true,
                preferRelative: false,
                tryIndex: true,
                ...options,
                // Ignore sideEffects and other computations as we only need the id
                idOnly: true,
              },
              environment.config,
            )
            : [
              resolvePlugin({
                root: config.root,
                isProduction: config.isProduction,
                isBuild: config.command === 'build',
                asSrc: true,
                preferRelative: false,
                tryIndex: true,
                ...options,
                // Ignore sideEffects and other computations as we only need the id
                idOnly: true,
              }),
            ]),
        ],
        undefined,
        false,
      )
      pluginContainerMap.set(environment, pluginContainer)
    }
    return await pluginContainer.resolveId(id, importer, { scan })
  }

  const aliasOnlyPluginContainerMap = new Map<
    PartialEnvironment,
    EnvironmentPluginContainer
  >()
  async function resolveAlias(
    environment: PartialEnvironment,
    id: string,
    importer?: string,
  ): Promise<PartialResolvedId | null> {
    let pluginContainer = aliasOnlyPluginContainerMap.get(environment)
    if (!pluginContainer) {
      pluginContainer = await createEnvironmentPluginContainer(
        environment as Environment,
        // @ts-expect-error  the aliasPlugin uses rollup types
        [aliasPlugin({ entries: environment.config.resolve.alias })],
        undefined,
        false,
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
