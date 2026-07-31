import { describe, expect, test, vi } from 'vite-plus/test'
import type {
  LoadResult,
  Plugin,
  PluginContext,
  ResolveIdExtraOptions,
  ResolveIdResult,
} from 'rolldown'

vi.mock('../idResolver', () => ({
  createBackCompatIdResolver: (config: { createResolver: () => unknown }) =>
    config.createResolver(),
}))

vi.mock('../plugins/importAnalysis', () => ({
  hasViteIgnoreRE: /\/\*\s*@vite-ignore\s*\*\//,
}))

vi.mock('../plugins/resolve', () => ({
  browserExternalId: '__vite-browser-external',
  optionalPeerDepId: '__vite-optional-peer-dep',
}))

import type { Environment } from '../environment'
import { rolldownDepPlugin } from './rolldownDepPlugin'

type ResolveIdHandler = (
  this: PluginContext,
  id: string,
  importer: string | undefined,
  options: ResolveIdExtraOptions,
) => ResolveIdResult | Promise<ResolveIdResult>

type LoadHandler = (
  this: PluginContext,
  id: string,
) => LoadResult | Promise<LoadResult>

type TransformHook = {
  filter: { code: RegExp }
  handler: (
    this: PluginContext,
    code: string,
    id: string,
  ) => unknown | Promise<unknown>
}

const context = {} as PluginContext

function getResolveIdHandler(plugin: Plugin): ResolveIdHandler {
  const hook = plugin.resolveId
  if (!hook) {
    throw new Error(`Plugin "${plugin.name}" has no resolveId hook`)
  }
  return typeof hook === 'function' ? hook : hook.handler
}

function getLoadHandler(plugin: Plugin): LoadHandler {
  const hook = plugin.load
  if (!hook) {
    throw new Error(`Plugin "${plugin.name}" has no load hook`)
  }
  return typeof hook === 'function' ? hook : hook.handler
}

function getTransformHook(plugin: Plugin): TransformHook {
  const hook = plugin.transform
  if (!hook || typeof hook === 'function') {
    throw new Error(`Plugin "${plugin.name}" has no object transform hook`)
  }
  if (!(hook.filter?.code instanceof RegExp)) {
    throw new Error(`Plugin "${plugin.name}" has no RegExp code filter`)
  }
  return hook as TransformHook
}

function createPlugins(resolved: string) {
  const resolver = vi.fn<() => Promise<string>>(async () => resolved)
  const config = {
    cacheDir: '/project/node_modules/.vite',
    isProduction: false,
    optimizeDeps: { extensions: [] },
    resolve: { builtins: [] },
    createResolver: () => resolver,
  }
  const environment = {
    name: 'client',
    config,
    getTopLevelConfig: () => config,
  } as unknown as Environment
  const plugins = rolldownDepPlugin(environment, {}, []) as Plugin[]
  const assetPlugin = plugins.find(
    plugin => plugin.name === 'vite:dep-pre-bundle-assets',
  )
  const depPlugin = plugins.find(
    plugin => plugin.name === 'vite:dep-pre-bundle',
  )

  if (!assetPlugin || !depPlugin) {
    throw new Error('Could not find dependency pre-bundle plugins')
  }

  return { assetPlugin, depPlugin }
}

describe('rolldownDepPlugin asset entrypoints', () => {
  const resolved = '/project/node_modules/css-entry/style.css'
  const id = 'css-entry'
  const importer = '/project/src/main.js'

  test('externalizes an imported package with a CSS entrypoint', async () => {
    const { depPlugin } = createPlugins(resolved)

    expect(
      await getResolveIdHandler(depPlugin).call(context, id, importer, {
        isEntry: false,
        kind: 'import-statement',
      }),
    ).toEqual({
      id: resolved,
      external: 'absolute',
    })
  })

  test('converts a required package with a CSS entrypoint to an external import', async () => {
    const { assetPlugin, depPlugin } = createPlugins(resolved)
    const conversionId =
      'vite:dep-pre-bundle:external-conversion' + resolved
    const externalId = 'vite-dep-pre-bundle-external:' + resolved

    expect(
      await getResolveIdHandler(depPlugin).call(context, id, importer, {
        isEntry: false,
        kind: 'require-call',
      }),
    ).toEqual({ id: conversionId })

    expect(await getLoadHandler(assetPlugin).call(context, conversionId))
      .toEqual({
        code: `import "${externalId}";`,
      })

    expect(
      await getResolveIdHandler(assetPlugin).call(
        context,
        externalId,
        conversionId,
        {
          isEntry: false,
          kind: 'import-statement',
        },
      ),
    ).toEqual({
      id: resolved,
      external: 'absolute',
    })
  })
})

describe('rolldownDepPlugin asset URL transform filter', () => {
  const resolved = '/project/node_modules/pkg/index.js'
  const id = '/project/node_modules/pkg/index.js'

  test('does not match unrelated new URL and import.meta.url expressions', () => {
    const { depPlugin } = createPlugins(resolved)
    const { filter } = getTransformHook(depPlugin)
    const largeCode =
      `new URL('https://example.com');\n`.repeat(200) +
      `var a = 1;\n`.repeat(200_000) +
      `console.log(import.meta.url);\n`

    filter.code.lastIndex = 0
    expect(filter.code.test(largeCode)).toBe(false)
  })

  test('matches and transforms a valid asset URL with a fresh regex', () => {
    const { depPlugin } = createPlugins(resolved)
    const transform = getTransformHook(depPlugin)
    const code = `const asset = new URL('./asset.png', import.meta.url)`

    transform.filter.code.lastIndex = 0
    expect(transform.filter.code.test(code)).toBe(true)
    expect(transform.filter.code.lastIndex).toBeGreaterThan(0)

    const result = transform.handler.call(context, code, id)
    expect(result).not.toBeInstanceOf(Promise)
    expect(result).toMatchObject({
      code: `const asset = new URL('' + "../../pkg/asset.png", import.meta.url)`,
    })
    transform.filter.code.lastIndex = 0
  })
})
