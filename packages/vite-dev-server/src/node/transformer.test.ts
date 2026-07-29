import { createVirtualFSWatcher } from '@vrowzer/fs/watcher'
import { describe, expect, onTestFinished, test, vi } from 'vite-plus/test'

// transformer.ts is also a runtime barrel. Stub its re-export graph so this
// test exercises setupHMR without initializing browser WASM or memfs.
vi.mock('@vrowzer/fs', () => ({
  fs: {},
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
  resolveConfig: async () => ({}),
}))

vi.mock('./plugins/esbuild', () => ({
  reloadOnTsconfigChange: () => undefined,
}))

vi.mock('./publicDir', () => ({
  initPublicFiles: async () => undefined,
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
  handleHMRUpdate: async () => undefined,
  handlePrunedModules: async () => undefined,
  lexAcceptedHmrDeps: () => undefined,
  lexAcceptedHmrExports: () => undefined,
  normalizeHmrUrl: (url: string) => url,
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
  createMessageChannelServer: () => ({}),
  isMessageChannelServer: () => false,
}))

vi.mock('./server/middlewares/indexHtml', () => ({
  createDevHtmlTransformFn: () => undefined,
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

import { setupHMR } from './transformer'

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
