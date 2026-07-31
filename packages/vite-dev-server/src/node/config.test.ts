import { afterAll, beforeAll, describe, expect, test, vi } from 'vite-plus/test'
import { fileURLToPath } from 'node:url'
import type { PluginContext } from 'rolldown'
import { UnknownEnvironment } from './baseEnvironment'
import type { InlineConfig, ResolvedConfig } from './config'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteJsonPlugin: vi.fn<() => { name: string }>(() => ({
    name: 'vite:json',
  })),
  viteTransformPlugin: vi.fn<() => { name: string }>(() => ({
    name: 'native:transform',
  })),
}))

vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: vi.fn<(...args: unknown[]) => unknown>(),
  parseAstAsync: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

import { resolveConfig } from './config'
import type { Plugin } from './plugin'
import { fileToUrl } from './plugins/asset'
import { definePlugin } from './plugins/define'
import { mergeConfig } from './utils'

beforeAll(() => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function environmentBundledState(config: ResolvedConfig) {
  return Object.fromEntries(
    Object.entries(config.environments).map(([name, environment]) => [
      name,
      environment.isBundled,
    ]),
  )
}

function createInlineConfig(config: InlineConfig = {}): InlineConfig {
  return {
    configFile: false,
    logLevel: 'silent',
    root: '/',
    ...config,
  }
}

function findEnvironmentPlugin(
  config: ResolvedConfig,
  environmentName: string,
  pluginName: string,
): Plugin {
  const plugin = config.environments[environmentName].plugins.find(
    ({ name }) => name === pluginName,
  )
  expect(plugin, `${pluginName} should be active in ${environmentName}`).toBeDefined()
  return plugin!
}

async function resolveMixedClientConfig() {
  return resolveConfig(
    createInlineConfig({
      environments: {
        client: {
          consumer: 'client',
          isBundled: false,
        },
        bundled: {
          consumer: 'client',
          isBundled: true,
        },
      },
    }),
    'serve',
  )
}

describe('resolveConfig build option compatibility', () => {
  test('maps legacy rollupOptions input to rolldownOptions', async () => {
    const input = 'entry-client.ts'
    const config = await resolveConfig(
      createInlineConfig({
        build: {
          rollupOptions: { input },
        },
      }),
      'serve',
    )

    for (const build of [
      config.build,
      config.environments.client.build,
    ]) {
      expect(build.rolldownOptions.input).toBe(input)
      expect(build.rollupOptions).toBe(build.rolldownOptions)
    }
  })
})

describe('input config', () => {
  test.each([
    ['string + string', 'src/a.ts', 'src/b.ts', ['src/a.ts', 'src/b.ts']],
    ['array + string', ['src/a.ts'], 'src/b.ts', ['src/a.ts', 'src/b.ts']],
    ['string + array', 'src/a.ts', ['src/b.ts'], ['src/a.ts', 'src/b.ts']],
    ['array + array', ['src/a.ts'], ['src/b.ts'], ['src/a.ts', 'src/b.ts']],
    [
      'record + record',
      { a: 'src/a.ts', shared: 'src/old.ts' },
      { b: 'src/b.ts', shared: 'src/new.ts' },
      { a: 'src/a.ts', b: 'src/b.ts', shared: 'src/new.ts' },
    ],
    [
      'string + record',
      'src/a.ts',
      { b: 'src/b.ts' },
      { a: 'src/a.ts', b: 'src/b.ts' },
    ],
    [
      'record + string',
      { a: 'src/a.ts' },
      'src/b.ts',
      { a: 'src/a.ts', b: 'src/b.ts' },
    ],
    [
      'array + record',
      ['src/a.ts'],
      { b: 'src/b.ts' },
      { a: 'src/a.ts', b: 'src/b.ts' },
    ],
  ])('merges top-level input: %s', (_name, defaults, overrides, expected) => {
    expect(mergeConfig({ input: defaults }, { input: overrides })).toEqual({
      input: expected,
    })
  })

  test('does not apply input merging to nested build options', () => {
    expect(
      mergeConfig(
        { build: { input: 'src/a.ts' } },
        { build: { input: 'src/b.ts' } },
      ),
    ).toEqual({ build: { input: 'src/b.ts' } })
  })

  test('applies top-level input to the client environment only', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        input: 'src/main.ts',
        environments: {
          ssr: { input: 'src/entry-server.ts' },
        },
      }),
      'serve',
    )

    expect(config.input).toBe('src/main.ts')
    expect(config.environments.client.input).toBe('src/main.ts')
    expect(config.environments.ssr.input).toBe('src/entry-server.ts')
    expect(config.environments.client.build.rolldownOptions.input).toBeUndefined()
    expect(config.environments.ssr.build.rolldownOptions.input).toBeUndefined()
  })

  test.each([
    [['src/a.ts', 'src/b.ts']],
    [{ main: 'src/a.ts', admin: 'src/b.ts' }],
  ])('keeps input relative to the project root: %j', async (input) => {
    const config = await resolveConfig(createInlineConfig({ input }), 'serve')

    expect(config.input).toEqual(input)
    expect(config.environments.client.input).toEqual(input)
  })

  test.each([
    ['src/*.ts'],
    ['src/page?.ts'],
    ['src/[id].ts'],
    [['src/main.ts', 'src/*.ts']],
    [{ main: 'src/{a,b}.ts' }],
  ])('rejects dynamic input patterns: %j', async (input) => {
    await expect(
      resolveConfig(createInlineConfig({ input }), 'serve'),
    ).rejects.toThrow(/`input` cannot contain glob characters/)
  })

  test.each([
    ['src/\\*.ts', 'src/*.ts'],
    [['src/\\*.ts'], ['src/*.ts']],
    [{ main: 'src/\\*.ts' }, { main: 'src/*.ts' }],
  ])('unescapes reserved glob characters: %j', async (input, expected) => {
    const config = await resolveConfig(createInlineConfig({ input }), 'serve')

    expect(config.input).toEqual(expected)
  })

  test('defaults build.lib.entry to top-level input', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        input: 'src/lib.ts',
        build: { lib: { name: 'VrowzerLib' } },
      }),
      'build',
    )

    expect(config.build.lib && config.build.lib.entry).toBe('src/lib.ts')
  })

  test('preserves an explicit build.lib.entry', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        input: 'src/lib.ts',
        build: {
          lib: {
            entry: 'src/explicit.ts',
            name: 'VrowzerLib',
          },
        },
      }),
      'build',
    )

    expect(config.build.lib && config.build.lib.entry).toBe('src/explicit.ts')
  })
})

describe('resolveConfig per-environment isBundled', () => {
  test('defaults serve environments to unbundled', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          custom: {},
        },
      }),
      'serve',
    )

    expect(environmentBundledState(config)).toEqual({
      client: false,
      ssr: false,
      custom: false,
    })
    expect(config).not.toHaveProperty('isBundled')
  })

  test('seeds only the client environment from bundledDev', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          custom: {
            consumer: 'client',
          },
        },
        experimental: {
          bundledDev: true,
        },
      }),
      'serve',
    )

    expect(environmentBundledState(config)).toEqual({
      client: true,
      ssr: false,
      custom: false,
    })
    expect(config.environments.client.build.minify).toBe(false)
    expect(config.environments.custom.build.minify).toBe('oxc')
  })

  test('prefers explicit environment values over serve defaults', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          client: {
            isBundled: false,
          },
          ssr: {
            isBundled: true,
          },
          custom: {
            consumer: 'client',
            isBundled: true,
          },
        },
        experimental: {
          bundledDev: true,
        },
      }),
      'serve',
    )

    expect(environmentBundledState(config)).toEqual({
      client: false,
      ssr: true,
      custom: true,
    })
  })

  test('defaults build environments to bundled unless explicitly disabled', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          custom: {
            consumer: 'client',
          },
          unbundled: {
            consumer: 'client',
            isBundled: false,
          },
        },
      }),
      'build',
    )

    expect(environmentBundledState(config)).toEqual({
      client: true,
      custom: true,
      unbundled: false,
    })
    expect(config.environments.client.build.minify).toBe('oxc')
  })

  test('selects unbundled and native plugins per environment', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          client: {
            isBundled: false,
          },
          ssr: {
            isBundled: true,
          },
        },
      }),
      'serve',
    )

    const clientPlugins = config.environments.client.plugins.map(
      (plugin) => plugin.name,
    )
    const ssrPlugins = config.environments.ssr.plugins.map(
      (plugin) => plugin.name,
    )
    const unbundledOnlyPlugins = [
      'vite:pre-alias',
      'vite:client-inject',
      'vite:css-analysis',
      'vite:import-analysis',
    ]

    expect(clientPlugins).toEqual(
      expect.arrayContaining(unbundledOnlyPlugins),
    )
    expect(clientPlugins).toContain('vite:oxc')
    expect(clientPlugins).not.toContain('native:transform')
    for (const plugin of unbundledOnlyPlugins) {
      expect(ssrPlugins).not.toContain(plugin)
    }
    expect(ssrPlugins).toContain('native:transform')
    expect(ssrPlugins).not.toContain('vite:oxc')
  })

  test('preserves the native plugin enablement level', async () => {
    const config = await resolveConfig(
      createInlineConfig({
        environments: {
          bundled: {
            consumer: 'client',
            isBundled: true,
          },
        },
        experimental: {
          enableNativePlugin: false,
        },
      }),
      'serve',
    )
    const bundledPlugins = config.environments.bundled.plugins.map(
      (plugin) => plugin.name,
    )

    expect(bundledPlugins).toContain('vite:oxc')
    expect(bundledPlugins).not.toContain('native:transform')
  })

  test('selects the define implementation per environment', async () => {
    const config = await resolveMixedClientConfig()
    const plugin = definePlugin(config)
    const unbundledEnvironment = new UnknownEnvironment('client', config)
    const bundledEnvironment = new UnknownEnvironment('bundled', config)

    expect(
      await plugin.applyToEnvironment!(unbundledEnvironment),
    ).toBe(true)
    expect(
      await plugin.applyToEnvironment!(bundledEnvironment),
    ).toMatchObject({
      name: 'vite:define',
      options: expect.any(Function),
    })
  })

  test('uses the current environment for CSS dev injection', async () => {
    const config = await resolveMixedClientConfig()
    const unbundledEnvironment = new UnknownEnvironment('client', config)
    const bundledEnvironment = new UnknownEnvironment('bundled', config)
    const cssPlugin = findEnvironmentPlugin(config, 'client', 'vite:css')
    const cssPostPlugin = findEnvironmentPlugin(
      config,
      'client',
      'vite:css-post',
    )

    await (cssPlugin.buildStart as Function).call({
      environment: unbundledEnvironment,
    })
    const transform = (cssPostPlugin.transform as { handler: Function }).handler
    const unbundledResult = (await transform.call(
      { environment: unbundledEnvironment },
      '.app {}',
      '/style.css',
    )) as { code: string }
    const bundledResult = (await transform.call(
      { environment: bundledEnvironment },
      '.app {}',
      '/style.css',
    )) as { code: string }

    expect(unbundledResult.code).toContain('from "/@vite/client"')
    expect(unbundledResult.code).not.toContain('import.meta.hot._internal')
    expect(bundledResult.code).toContain('import.meta.hot._internal')
    expect(bundledResult.code).not.toContain('from "/@vite/client"')
  })

  test('uses the current environment for bundled dev asset URLs', async () => {
    const config = await resolveMixedClientConfig()
    const environment = new UnknownEnvironment('bundled', config)
    const plugin = findEnvironmentPlugin(config, 'bundled', 'vite:asset')
    const emitFile = vi.fn<(...args: unknown[]) => string>(() => 'asset-ref')
    const getFileName = vi.fn<(...args: unknown[]) => string>(
      () => 'assets/config-test.ts',
    )

    await (plugin.buildStart as Function).call({ environment })
    const url = await fileToUrl(
      {
        environment,
        emitFile,
        getFileName,
      } as unknown as PluginContext,
      `${fileURLToPath(import.meta.url)}?no-inline`,
    )

    expect(config.experimental.bundledDev).toBe(false)
    expect(emitFile).toHaveBeenCalledOnce()
    expect(getFileName).toHaveBeenCalledWith('asset-ref')
    expect(url).toBe('/assets/config-test.ts')
  })
})
