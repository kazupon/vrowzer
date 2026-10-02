import { fs } from '@vrowzer/fs'
import { createVirtualFSWatcher } from '@vrowzer/fs/watcher'
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vite-plus/test'

const hmrMocks = vi.hoisted(() => ({
  handleHMRUpdate: vi.fn<
    (type: 'create' | 'delete' | 'update', file: string, server: unknown) => Promise<void>
  >(async () => undefined),
}))

const publicDirMocks = vi.hoisted(() => ({
  initPublicFiles: vi.fn<() => Promise<Set<string> | undefined>>(async () => undefined),
}))

// transformer.ts is also a runtime barrel. Stub its re-export graph so this
// test exercises setupWorker, setupHMR and updateFile without initializing browser WASM.
vi.mock('@vrowzer/fs', () => ({
  fs: {
    existsSync: vi.fn<(path: string) => boolean>(() => false),
    mkdirSync: vi.fn<(path: string, options?: unknown) => void>(),
    writeFileSync: vi.fn<(path: string, data: unknown, options?: unknown) => void>(),
  },
  vol: {},
}))

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: () => undefined,
}))

vi.mock('@vrowzer/rolldown/experimental', () => ({
  memfs: {},
}))

vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: () => ({}),
}))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: () => ({}),
}))

vi.mock('birpc', () => ({
  createBirpc: () => ({}),
}))

vi.mock('../shared/rpc', () => ({
  deserializeRpcMessage: (value: unknown) => value,
  serializeRpcMessage: (value: unknown) => value,
}))

vi.mock('./config', () => ({
  defineConfig: (config: unknown) => config,
  isResolvedConfig: () => false,
  resolveConfig: vi.fn<() => Promise<object>>(async () => ({})),
}))

vi.mock('./plugins/esbuild', () => ({
  reloadOnTsconfigChange: () => undefined,
}))

vi.mock('./publicDir', () => ({
  initPublicFiles: publicDirMocks.initPublicFiles,
}))

vi.mock('./server/environment', () => ({
  DevEnvironment: class {},
}))

vi.mock('./server/pluginContainer', () => ({
  basePluginContextMeta: {},
  BasicMinimalPluginContext: class {},
  createEnvironmentPluginContainer: () => ({}),
  createPluginContainer: () => ({}),
  ERR_CLOSED_SERVER: Symbol('ERR_CLOSED_SERVER'),
  throwClosedServerError: () => undefined,
}))

vi.mock('./server/moduleGraph', () => ({
  EnvironmentModuleGraph: class {},
  EnvironmentModuleNode: class {},
}))

vi.mock('./server/transformRequest', () => ({
  ERR_DENIED_ID: 'ERR_DENIED_ID',
  ERR_LOAD_PUBLIC_URL: 'ERR_LOAD_PUBLIC_URL',
  ERR_LOAD_URL: 'ERR_LOAD_URL',
  getModuleTypeFromId: () => undefined,
  transformRequest: async () => null,
}))

vi.mock('./server/hmr', () => ({
  createServerHotChannel: () => ({}),
  getShortName: (file: string) => file,
  handleHMRUpdate: hmrMocks.handleHMRUpdate,
  handlePrunedModules: async () => undefined,
  lexAcceptedHmrDeps: () => undefined,
  lexAcceptedHmrExports: () => undefined,
  normalizeHotChannel: (channel: unknown) => channel,
  updateModules: async () => undefined,
}))

vi.mock('./server/mixedModuleGraph', () => ({
  ModuleGraph: class {},
}))

vi.mock('./server/transformAccess', () => ({
  isServerAccessDeniedForTransform: () => false,
}))

vi.mock('./server/ws', () => ({
  createMessageChannelServer: vi.fn<() => object>(() => ({})),
  isMessageChannelServer: () => false,
}))

vi.mock('./server/middlewares/indexHtml', () => ({
  createDevHtmlTransformFn: () => undefined,
}))

vi.mock('./server/requestPipeline', () => ({
  createRequestPipeline: () => undefined,
}))

vi.mock('./optimizer', () => ({
  isDepOptimizationDisabled: () => true,
}))

vi.mock('./optimizer/optimizer', () => ({
  createDepsOptimizer: () => undefined,
  createExplicitDepsOptimizer: () => undefined,
}))

vi.mock('./baseEnvironment', () => ({
  BaseEnvironment: class {},
}))

vi.mock('./logger', () => ({
  createLogger: () => ({}),
}))

vi.mock('./server/sourcemap', () => ({
  applySourcemapIgnoreList: () => undefined,
  extractSourcemapFromFile: () => undefined,
  injectSourcesContent: () => undefined,
}))

vi.mock('./server/warmup', () => ({
  warmupFiles: async () => undefined,
}))

vi.mock('./utils', () => ({
  createDebugger: () => undefined,
  normalizePath: (file: string) => file,
}))

vi.mock('./watch', () => ({
  createNoopWatcher: () => ({}),
  getResolvedOutDirs: () => [],
  resolveChokidarOptions: () => ({}),
  resolveEmptyOutDir: () => false,
}))

import { setupHMR, setupWorker, updateFile } from './transformer'
import { resolveConfig } from './config'
import { createMessageChannelServer } from './server/ws'
import { snapshotWorkerRuntimeConfig } from './worker-runtime-config'

describe('setupWorker runtime config boundary', () => {
  test('disables dependency optimization in every environment despite framework config changes', async () => {
    const runtime = { root: '/', base: '/preview/', publicDir: 'public', optimizeDeps: { disabled: true } }
    const environments = Object.fromEntries(['client', 'ssr', 'custom'].map(name => [name, {
      name,
      init: vi.fn<() => Promise<void>>(async () => undefined),
      hot: { listen: vi.fn<() => void>() },
    }]))
    const factories = Object.fromEntries(Object.entries(environments).map(([name, environment]) => [name, {
      dev: { createEnvironment: vi.fn<() => Promise<typeof environment>>(async () => environment) },
    }]))
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      ...runtime,
      optimizeDeps: { disabled: 'build' },
      publicDir: '/public',
      build: { outDir: 'dist', rollupOptions: {} },
      environments: factories,
    } as unknown as Awaited<ReturnType<typeof resolveConfig>>)

    await setupWorker({}, { runtimeConfig: snapshotWorkerRuntimeConfig(runtime) })

    for (const [name, factory] of Object.entries(factories)) {
      expect(factory.dev.createEnvironment).toHaveBeenCalledWith(
        name,
        expect.objectContaining({ optimizeDeps: { disabled: 'build' } }),
        expect.objectContaining({ disableDepsOptimizer: true }),
      )
      expect(environments[name]!.init).toHaveBeenCalledOnce()
      expect(environments[name]!.hot.listen).toHaveBeenCalledOnce()
    }
  })

  test('waits for config resolution and rejects hook changes before creating HMR resources', async () => {
    const runtime = { root: '/', base: '/preview/', publicDir: 'public' }
    let finish!: (value: Awaited<ReturnType<typeof resolveConfig>>) => void
    vi.mocked(resolveConfig).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    vi.mocked(createMessageChannelServer).mockClear()
    const failure = setupWorker({}, { runtimeConfig: snapshotWorkerRuntimeConfig(runtime) }).catch(error => error as Error)
    expect(createMessageChannelServer).not.toHaveBeenCalled()
    finish({ ...runtime, base: '/changed-by-hook/' } as Awaited<ReturnType<typeof resolveConfig>>)
    expect(await failure).toMatchObject({ message: expect.stringContaining('runtime-owned base') })
    expect(createMessageChannelServer).not.toHaveBeenCalled()
  })
})

describe('virtual files', () => {
  const bytes = [0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockClear()
    vi.mocked(fs.mkdirSync).mockClear()
    vi.mocked(fs.writeFileSync).mockClear()
  })

  test('updateFile() writes an ArrayBuffer as bytes and a string as UTF-8 text', () => {
    updateFile('/assets/logo.png', new Uint8Array(bytes).buffer)
    updateFile('/main.js', 'export {}')

    expect(fs.mkdirSync).toHaveBeenCalledWith('/assets', { recursive: true })
    expect(fs.writeFileSync).toHaveBeenCalledWith('/assets/logo.png', new Uint8Array(bytes))
    expect(fs.writeFileSync).toHaveBeenCalledWith('/main.js', 'export {}', { encoding: 'utf8' })
  })

  test('setupWorker() writes each initial file as bytes or UTF-8 text by its type', async () => {
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      root: '/',
      base: '/',
      publicDir: '/public',
      build: { outDir: 'dist', rollupOptions: {} },
      environments: {},
    } as unknown as Awaited<ReturnType<typeof resolveConfig>>)

    await setupWorker({}, {}, {
      '/public/logo.png': new Uint8Array(bytes).buffer,
      '/main.js': 'export {}',
    })

    expect(fs.writeFileSync).toHaveBeenCalledWith('/public/logo.png', new Uint8Array(bytes))
    expect(fs.writeFileSync).toHaveBeenCalledWith('/main.js', 'export {}', { encoding: 'utf8' })
    // The runtime provides /index.html, so the Web Worker does not write a default one
    expect(vi.mocked(fs.writeFileSync).mock.calls.map(([path]) => path)).not.toContain('/index.html')
  })

  test('setupWorker() writes the initial files before it resolves the config, which reads .env files', async () => {
    let writtenBeforeConfig: unknown[] = []
    vi.mocked(resolveConfig).mockImplementationOnce(async () => {
      writtenBeforeConfig = vi.mocked(fs.writeFileSync).mock.calls.map(([path]) => path)
      return {
        root: '/',
        base: '/',
        publicDir: '/public',
        build: { outDir: 'dist', rollupOptions: {} },
        environments: {},
      } as unknown as Awaited<ReturnType<typeof resolveConfig>>
    })

    await setupWorker({}, {}, {
      '/.env': 'VITE_TITLE=preview',
      '/main.js': 'export {}',
    })

    expect(writtenBeforeConfig).toEqual(expect.arrayContaining(['/.env', '/main.js']))
  })
})

describe('setupHMR watcher error handling', () => {
  test.each([
    ['add', 'create'],
    ['change', 'update'],
    ['unlink', 'delete'],
  ] as const)(
    'logs rejected watchChange for %s events',
    async (watcherEvent, pluginEvent) => {
      const error = new Error(`${watcherEvent} failed`)
      const logError = vi.fn<(error: unknown) => void>()
      const watchChange = vi
        .fn<
          (
            file: string,
            options: { event: 'create' | 'update' | 'delete' },
          ) => Promise<void>
        >()
        .mockRejectedValue(error)
      const watcher = createVirtualFSWatcher()
      onTestFinished(() => watcher.close())

      const environment = {
        pluginContainer: {
          watchChange,
        },
        moduleGraph: {
          onFileChange: vi.fn<(file: string) => void>(),
          onFileDelete: vi.fn<(file: string) => void>(),
        },
      }
      const server = {
        watcher,
        environments: {
          client: environment,
        },
        config: {
          publicDir: false,
          server: {
            hmr: false,
          },
          logger: {
            error: logError,
          },
        },
      } as unknown as Parameters<typeof setupHMR>[0]

      await setupHMR(server)
      watcher.emit(watcherEvent, '/src/main.ts')

      await vi.waitFor(() => {
        expect(logError).toHaveBeenCalledWith(error)
      })
      expect(watchChange).toHaveBeenCalledWith('/src/main.ts', {
        event: pluginEvent,
      })
    },
  )
})

interface Deferred {
  promise: Promise<void>
  resolve: () => void
}

function deferred(): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function isPending(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  promise.then(
    () => { settled = true },
    () => { settled = true },
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  return !settled
}

function createHMRServer() {
  const calls: string[] = []
  const logError = vi.fn<(error: unknown) => void>()
  const watchChange = vi.fn<
    (file: string, options: { event: 'create' | 'delete' | 'update' }) => Promise<void>
  >(async (file, { event }) => {
    calls.push(`watchChange:${event}:${file}`)
  })
  const watcher = createVirtualFSWatcher()
  onTestFinished(() => watcher.close())

  const server = {
    watcher,
    environments: {
      client: {
        pluginContainer: { watchChange },
        moduleGraph: {
          onFileChange: vi.fn<(file: string) => void>((file) => {
            calls.push(`onFileChange:${file}`)
          }),
          onFileDelete: vi.fn<(file: string) => void>((file) => {
            calls.push(`onFileDelete:${file}`)
          }),
        },
      },
    },
    config: {
      publicDir: false,
      server: {
        hmr: true,
      },
      logger: {
        error: logError,
      },
    },
  } as unknown as Parameters<typeof setupHMR>[0]

  return { calls, logError, server, watchChange, watcher }
}

describe('setupHMR file change tracking', () => {
  beforeEach(() => {
    hmrMocks.handleHMRUpdate.mockReset()
  })

  test.each([
    ['change', 'update', ['watchChange:update:/src/main.ts', 'onFileChange:/src/main.ts']],
    ['add', 'create', ['watchChange:create:/src/main.ts']],
    // A deleted file is invalidated before HMR as well, so that its cached transform
    // result is not served after waitForFileChange() resolves
    [
      'unlink',
      'delete',
      ['watchChange:delete:/src/main.ts', 'onFileChange:/src/main.ts', 'onFileDelete:/src/main.ts'],
    ],
  ] as const)(
    'waits for watchChange and invalidation of %s events, but not for HMR',
    async (watcherEvent, hmrType, invalidation) => {
      const { calls, server, watcher } = createHMRServer()
      const hmr = deferred()
      onTestFinished(() => hmr.resolve())
      hmrMocks.handleHMRUpdate.mockImplementation(async (type, file) => {
        calls.push(`hmr:${type}:${file}`)
        await hmr.promise
      })
      const { waitForFileChange } = await setupHMR(server)

      watcher.notify(watcherEvent, '/src/main.ts')

      await expect(waitForFileChange('/src/main.ts')).resolves.toBeUndefined()
      expect(calls.slice(0, invalidation.length)).toEqual(invalidation)
      // HMR still runs after the invalidation, and it has not finished
      await vi.waitFor(() => {
        expect(calls).toEqual([...invalidation, `hmr:${hmrType}:/src/main.ts`])
      })
    },
  )

  test.each(['add', 'change', 'unlink'] as const)(
    'rejects with the watchChange error of %s events and skips HMR',
    async (watcherEvent) => {
      const { logError, server, watchChange, watcher } = createHMRServer()
      const error = new Error(`${watcherEvent} failed`)
      watchChange.mockRejectedValue(error)
      const { waitForFileChange } = await setupHMR(server)

      watcher.notify(watcherEvent, '/src/main.ts')

      await expect(waitForFileChange('/src/main.ts')).rejects.toBe(error)
      await vi.waitFor(() => {
        expect(logError).toHaveBeenCalledWith(error)
      })
      expect(hmrMocks.handleHMRUpdate).not.toHaveBeenCalled()
    },
  )

  test('returns the processing of each event for the same path', async () => {
    const { server, watchChange, watcher } = createHMRServer()
    const held = deferred()
    watchChange.mockImplementationOnce(() => held.promise)
    const { waitForFileChange } = await setupHMR(server)

    watcher.notify('change', '/src/main.ts')
    const first = waitForFileChange('/src/main.ts')
    watcher.notify('change', '/src/main.ts')
    const second = waitForFileChange('/src/main.ts')

    await expect(second).resolves.toBeUndefined()
    expect(await isPending(first)).toBe(true)
    held.resolve()
    await expect(first).resolves.toBeUndefined()
  })

  test('resolves at once without an event to wait for', async () => {
    const { server, watchChange, watcher } = createHMRServer()
    const held = deferred()
    watchChange.mockImplementationOnce(() => held.promise)
    const { waitForFileChange } = await setupHMR(server)

    await expect(waitForFileChange('/src/none.ts')).resolves.toBeUndefined()

    watcher.notify('change', '/src/main.ts')
    const taken = waitForFileChange('/src/main.ts')
    // The event was already taken, so nothing is left to wait for
    await expect(waitForFileChange('/src/main.ts')).resolves.toBeUndefined()
    expect(await isPending(taken)).toBe(true)
    held.resolve()
    await expect(taken).resolves.toBeUndefined()
  })

  test('keeps the public files that it returns up to date', async () => {
    const { server, watcher } = createHMRServer()
    const config = server.config as unknown as { publicDir: string }
    config.publicDir = '/public'
    const client = server.environments.client as unknown as { moduleGraph: Record<string, unknown> }
    client.moduleGraph.getModuleByUrl = vi.fn<(url: string) => Promise<undefined>>(async () => undefined)
    publicDirMocks.initPublicFiles.mockResolvedValueOnce(new Set(['/old.txt']))
    const { publicFiles, waitForFileChange } = await setupHMR(server)

    watcher.notify('add', '/public/new.txt')
    await waitForFileChange('/public/new.txt')
    watcher.notify('unlink', '/public/old.txt')
    await waitForFileChange('/public/old.txt')

    expect(publicFiles).toEqual(new Set(['/new.txt']))
  })

  test('forgets an event that settled without being taken', async () => {
    const { logError, server, watchChange, watcher } = createHMRServer()
    const error = new Error('change failed')
    watchChange.mockRejectedValueOnce(error)
    const { waitForFileChange } = await setupHMR(server)

    watcher.notify('change', '/src/main.ts')
    await vi.waitFor(() => {
      expect(logError).toHaveBeenCalledWith(error)
    })

    await expect(waitForFileChange('/src/main.ts')).resolves.toBeUndefined()
  })
})
