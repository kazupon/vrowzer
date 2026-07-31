import { describe, expect, test, vi } from 'vite-plus/test'

vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('../plugins/importMetaGlob', () => ({
  transformGlobImport: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('../plugins/oxc', () => ({
  getRollupJsxPresets: vi.fn<(...args: unknown[]) => unknown>(),
}))

import type { InputOption } from 'rolldown'
import type { Plugin } from '../plugin'
import type { DevEnvironment } from './environment'
import { createEnvironmentPluginContainer } from './pluginContainer'
import { registerInputsAsSafeModules } from './safeModulePaths'

function createRegistrationContext(
  input: InputOption | undefined,
  resolveId: (
    id: string,
    importer: undefined,
    options: { isEntry: true; scan: true },
  ) => Promise<{
    id: string
    external?: boolean | 'absolute' | 'relative'
  } | null | undefined>,
) {
  const safeModulePaths = new Set<string>()
  const syncSafeModulePaths = vi.fn<(paths: string[]) => Promise<void>>(
    async () => undefined,
  )
  const resolver = vi.fn(resolveId)

  return { input, resolver, safeModulePaths, syncSafeModulePaths }
}

function createLifecycleEnvironment(plugins: Plugin[]) {
  const registerInputs = vi.fn<() => Promise<void>>(async () => undefined)
  const logger = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warnOnce: vi.fn(),
  }
  const config = {
    build: {
      rollupOptions: {},
      rolldownOptions: {},
    },
    consumer: 'client',
    root: '/',
    server: {
      perEnvironmentStartEndDuringDev: false,
    },
  }
  const environment = {
    config,
    getTopLevelConfig: () => config,
    logger,
    mode: 'dev',
    name: 'client',
    plugins,
    _registerInputsAsSafeModules: registerInputs,
  } as unknown as DevEnvironment

  return { environment, registerInputs }
}

describe('DevEnvironment input registration', () => {
  test('registers only clean absolute non-external input paths', async () => {
    const input = {
      main: 'virtual:main',
      duplicate: 'virtual:duplicate',
      external: 'virtual:external',
      relative: 'virtual:relative',
    }
    const { resolver, safeModulePaths, syncSafeModulePaths } =
      createRegistrationContext(input, async (id) => {
        if (id === 'virtual:external') {
          return { id: '/outside/external.ts', external: true }
        }
        if (id === 'virtual:relative') {
          return { id: 'relative.ts' }
        }
        return { id: '/outside/main.ts?import' }
      })

    await registerInputsAsSafeModules(
      input,
      resolver,
      safeModulePaths,
      syncSafeModulePaths,
    )

    expect(resolver).toHaveBeenCalledTimes(4)
    for (const entry of Object.values(input)) {
      expect(resolver).toHaveBeenCalledWith(
        entry,
        undefined,
        { isEntry: true, scan: true },
      )
    }
    expect(safeModulePaths).toEqual(new Set(['/outside/main.ts']))
    expect(syncSafeModulePaths).toHaveBeenCalledOnce()
    expect(syncSafeModulePaths).toHaveBeenCalledWith(['/outside/main.ts'])
  })

  test('silently ignores fallback index resolution errors', async () => {
    const { resolver, safeModulePaths, syncSafeModulePaths } =
      createRegistrationContext(undefined, async () => {
        throw new Error('index.html is not available')
      })

    await expect(
      registerInputsAsSafeModules(
        undefined,
        resolver,
        safeModulePaths,
        syncSafeModulePaths,
      ),
    ).resolves.toBeUndefined()
    expect(resolver).toHaveBeenCalledWith(
      'index.html',
      undefined,
      { isEntry: true, scan: true },
    )
    expect(safeModulePaths).toEqual(new Set())
    expect(syncSafeModulePaths).not.toHaveBeenCalled()
  })

  test('syncs an input path that is already registered locally', async () => {
    const resolvedInput = '/outside/main.ts'
    const { resolver, safeModulePaths, syncSafeModulePaths } =
      createRegistrationContext('virtual:entry', async () => ({
        id: resolvedInput,
      }))
    safeModulePaths.add(resolvedInput)

    await registerInputsAsSafeModules(
      'virtual:entry',
      resolver,
      safeModulePaths,
      syncSafeModulePaths,
    )

    expect(safeModulePaths).toEqual(new Set([resolvedInput]))
    expect(syncSafeModulePaths).toHaveBeenCalledWith([resolvedInput])
  })

  test('propagates explicit input resolution errors', async () => {
    const { resolver, safeModulePaths, syncSafeModulePaths } =
      createRegistrationContext(
        'virtual:entry',
        async () => {
          throw new Error('explicit input failed')
        },
      )

    await expect(
      registerInputsAsSafeModules(
        'virtual:entry',
        resolver,
        safeModulePaths,
        syncSafeModulePaths,
      ),
    ).rejects.toThrow('explicit input failed')
  })
})

describe('plugin container input lifecycle', () => {
  test('registers inputs after buildStart hooks complete', async () => {
    const calls: string[] = []
    const plugin: Plugin = {
      name: 'test:build-start-order',
      buildStart() {
        calls.push('buildStart')
      },
    }
    const { environment, registerInputs } =
      createLifecycleEnvironment([plugin])
    registerInputs.mockImplementation(async () => {
      calls.push('registerInputs')
    })
    const container = await createEnvironmentPluginContainer(
      environment,
      [plugin],
      undefined,
      true,
    )

    try {
      await container.buildStart()
      expect(calls).toEqual(['buildStart', 'registerInputs'])
    } finally {
      await container.close()
    }
  })

  test('does not hide buildStart hook errors', async () => {
    const plugin: Plugin = {
      name: 'test:failing-build-start',
      buildStart() {
        throw new Error('buildStart failed')
      },
    }
    const { environment, registerInputs } =
      createLifecycleEnvironment([plugin])
    const container = await createEnvironmentPluginContainer(
      environment,
      [plugin],
      undefined,
      true,
    )

    try {
      await expect(container.buildStart()).rejects.toThrow('buildStart failed')
      expect(registerInputs).not.toHaveBeenCalled()
    } finally {
      await container.close()
    }
  })
})
