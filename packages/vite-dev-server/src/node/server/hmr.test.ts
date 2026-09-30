import { describe, expect, test, vi } from 'vite-plus/test'
import type { HotPayload } from '#types/hmrPayload'
import type { DevEnvironment } from './environment'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteTransformPlugin: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/parseAst', async () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

import type { ViteDevServer } from '..'
import { handleHMRUpdate, updateModules } from './hmr'
import { EnvironmentModuleGraph, EnvironmentModuleNode } from './moduleGraph'

function createEnvironment() {
  const send = vi.fn<(payload: HotPayload) => void>()
  const environment = {
    name: 'client',
    config: { root: '/project', server: {} },
    hot: { send },
    logger: { info: vi.fn<() => void>() },
    moduleGraph: new EnvironmentModuleGraph('client', async () => null),
  } as unknown as DevEnvironment
  return { environment, send }
}

describe('HMR module URLs', () => {
  test.each(['/entry.js', 'virtual:entry', '\0virtual:entry', '\0virtual:entry?query=1'])(
    'sends the module URL %s without browser wrapping', (url) => {
      const { environment, send } = createEnvironment()
      const module = new EnvironmentModuleNode(url, 'client')
      module.isSelfAccepting = true

      updateModules(environment, '/entry.js', [module], 123)

      expect(send).toHaveBeenCalledExactlyOnceWith({
        type: 'update',
        updates: [expect.objectContaining({ path: url, acceptedPath: url, timestamp: 123 })],
      })
    },
  )

  test('uses module URLs for both a virtual boundary and its accepted dependency', () => {
    const { environment, send } = createEnvironment()
    const parent = new EnvironmentModuleNode('\0virtual:parent', 'client')
    const dependency = new EnvironmentModuleNode('\0virtual:dep?query=1', 'client')
    dependency.importers.add(parent)
    parent.importedModules.add(dependency)
    parent.acceptedHmrDeps.add(dependency)

    updateModules(environment, '/dep.js', [dependency], 123)

    expect(send).toHaveBeenCalledExactlyOnceWith({
      type: 'update',
      updates: [expect.objectContaining({ path: parent.url, acceptedPath: dependency.url })],
    })
  })

  test('detects circular invalidation using the unwrapped module URL', () => {
    const { environment, send } = createEnvironment()
    const module = new EnvironmentModuleNode('\0virtual:entry?query=1', 'client')
    module.isSelfAccepting = true

    updateModules(environment, 'entry.js', [module], 123, module.url)

    expect(send).toHaveBeenCalledExactlyOnceWith({
      type: 'full-reload',
      path: '*',
      triggeredBy: '/project/entry.js',
    })
  })
})

describe('handleHMRUpdate during a server restart', () => {
  // Worker-side servers cannot restart, so a plugin hook replacing
  // `server.environments` stands in for `server.restart()`.
  function createServer(
    onHotUpdate: (server: ViteDevServer) => void | Promise<void>,
  ) {
    const send = vi.fn<(payload: HotPayload) => void>()
    const hotUpdateEnvironments = vi.fn<() => Promise<void>>(
      async () => undefined,
    )
    const client = {
      name: 'client',
      hot: { send },
      moduleGraph: new EnvironmentModuleGraph('client', async () => null),
      pluginContainer: { minimalContext: {} },
      plugins: [
        {
          name: 'restart-during-hot-update',
          async hotUpdate() {
            await onHotUpdate(server)
          },
        },
      ],
    } as unknown as DevEnvironment
    const server = {
      config: {
        root: '/project',
        configFileDependencies: [],
        experimental: {},
        logger: { info: vi.fn<() => void>(), error: vi.fn<() => void>() },
        server: { hotUpdateEnvironments },
      },
      environments: { client },
      moduleGraph: { getModulesByFile: () => undefined },
    } as unknown as ViteDevServer
    return { server, send, hotUpdateEnvironments }
  }

  function restart(server: ViteDevServer) {
    server.environments = {
      client: { ...server.environments.client } as DevEnvironment,
    }
  }

  test('dispatches HMR when the environments are unchanged', async () => {
    const { server, hotUpdateEnvironments } = createServer(() => undefined)

    await handleHMRUpdate('update', '/project/main.js', server)

    expect(hotUpdateEnvironments).toHaveBeenCalledOnce()
  })

  test('cancels HMR when the server restarts during a hot update', async () => {
    const { server, send, hotUpdateEnvironments } = createServer(restart)

    await expect(
      handleHMRUpdate('update', '/project/main.js', server),
    ).resolves.toBeUndefined()

    expect(hotUpdateEnvironments).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  test('drops a hot update error thrown after the server restarts', async () => {
    const { server, send, hotUpdateEnvironments } = createServer((server) => {
      restart(server)
      throw new Error('hot update interrupted by restart')
    })

    await expect(
      handleHMRUpdate('update', '/project/main.js', server),
    ).resolves.toBeUndefined()

    expect(hotUpdateEnvironments).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })
})
