import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import type { DevEnvironment } from '../server/environment'
import type {
  DepOptimizationMetadata,
  OptimizedDepInfo,
} from './index'

const optimizerMocks = vi.hoisted(() => {
  const createMetadata = (): DepOptimizationMetadata => ({
    browserHash: 'browser-hash',
    chunks: {},
    configHash: 'config-hash',
    depInfoList: [],
    discovered: {},
    hash: 'hash',
    lockfileHash: 'lockfile-hash',
    optimized: {},
  })

  return {
    createMetadata,
    discoverProjectDependencies: vi.fn<
      (...args: unknown[]) => {
        cancel: () => Promise<void>
        result: Promise<Record<string, string>>
      }
    >(),
    initDepsOptimizerMetadata: vi.fn<
      (...args: unknown[]) => DepOptimizationMetadata
    >(createMetadata),
    loadCachedDepOptimizationMetadata: vi.fn<
      (...args: unknown[]) => Promise<DepOptimizationMetadata | undefined>
    >(),
    runOptimizeDeps: vi.fn<(...args: unknown[]) => unknown>(),
  }
})

vi.mock('./index', () => ({
  addManuallyIncludedOptimizeDeps: () => Promise.resolve(),
  addOptimizedDepInfo: (
    metadata: DepOptimizationMetadata,
    type: 'optimized' | 'discovered' | 'chunks',
    depInfo: OptimizedDepInfo,
  ) => {
    metadata[type][depInfo.id] = depInfo
    metadata.depInfoList.push(depInfo)
    return depInfo
  },
  createIsOptimizedDepFile: () => () => false,
  createIsOptimizedDepUrl: () => () => false,
  depsFromOptimizedDepInfo: () => ({}),
  depsLogString: (ids: string[]) => ids.join(', '),
  discoverProjectDependencies: optimizerMocks.discoverProjectDependencies,
  extractExportsData: () =>
    Promise.resolve({ exports: [], hasModuleSyntax: true }),
  getOptimizedDepPath: (_environment: unknown, id: string) =>
    `/node_modules/.vite/deps/${id}.js`,
  initDepsOptimizerMetadata: optimizerMocks.initDepsOptimizerMetadata,
  loadCachedDepOptimizationMetadata:
    optimizerMocks.loadCachedDepOptimizationMetadata,
  optimizeExplicitEnvironmentDeps: () =>
    Promise.resolve(optimizerMocks.createMetadata()),
  runOptimizeDeps: optimizerMocks.runOptimizeDeps,
  toDiscoveredDependencies: () => ({}),
}))

vi.mock('./scan', () => ({
  devToScanEnvironment: vi.fn<(...args: unknown[]) => unknown>(),
}))

import { createDepsOptimizer } from './optimizer'

function createEnvironment(): DevEnvironment {
  return {
    config: {
      optimizeDeps: {
        holdUntilCrawlEnd: false,
        noDiscovery: false,
      },
    },
    logger: {
      error: vi.fn<(...args: unknown[]) => void>(),
      info: vi.fn<(...args: unknown[]) => void>(),
    },
    name: 'client',
    waitForRequestsIdle: () => new Promise(() => {}),
  } as unknown as DevEnvironment
}

beforeEach(() => {
  vi.useFakeTimers()
  optimizerMocks.discoverProjectDependencies.mockReset()
  optimizerMocks.discoverProjectDependencies.mockReturnValue({
    cancel: () => Promise.resolve(),
    result: Promise.resolve({}),
  })
  optimizerMocks.initDepsOptimizerMetadata.mockClear()
  optimizerMocks.loadCachedDepOptimizationMetadata.mockReset()
  optimizerMocks.runOptimizeDeps.mockReset()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('createDepsOptimizer initialization', () => {
  it('does not schedule an optimizer run before initialization', async () => {
    const optimizer = createDepsOptimizer(createEnvironment())

    optimizer.registerMissingImport('example', '/node_modules/example/index.js')

    expect(vi.getTimerCount()).toBe(0)
    expect(optimizerMocks.runOptimizeDeps).not.toHaveBeenCalled()
    await optimizer.close()
  })

  it('does not schedule an optimizer run while initializing', async () => {
    let resolveCachedMetadata:
      | ((metadata: DepOptimizationMetadata) => void)
      | undefined
    optimizerMocks.loadCachedDepOptimizationMetadata.mockReturnValue(
      new Promise((resolve) => {
        resolveCachedMetadata = resolve
      }),
    )
    const optimizer = createDepsOptimizer(createEnvironment())
    const initPromise = optimizer.init()

    optimizer.registerMissingImport('example', '/node_modules/example/index.js')

    expect(vi.getTimerCount()).toBe(0)
    expect(optimizerMocks.runOptimizeDeps).not.toHaveBeenCalled()
    resolveCachedMetadata?.(optimizerMocks.createMetadata())
    await initPromise
    await optimizer.close()
  })

  it('schedules optimizer runs after initialization', async () => {
    optimizerMocks.loadCachedDepOptimizationMetadata.mockResolvedValue(
      optimizerMocks.createMetadata(),
    )
    const optimizer = createDepsOptimizer(createEnvironment())
    await optimizer.init()

    optimizer.registerMissingImport('example', '/node_modules/example/index.js')

    expect(vi.getTimerCount()).toBe(1)
    expect(optimizerMocks.runOptimizeDeps).not.toHaveBeenCalled()
    await optimizer.close()
  })

  it('logs when dependency scanning takes longer than one second', async () => {
    let resolveDiscovery!: (deps: Record<string, string>) => void
    const discoveryResult = new Promise<Record<string, string>>((resolve) => {
      resolveDiscovery = resolve
    })
    optimizerMocks.discoverProjectDependencies.mockReturnValue({
      cancel: () => Promise.resolve(),
      result: discoveryResult,
    })
    optimizerMocks.loadCachedDepOptimizationMetadata.mockResolvedValue(
      undefined,
    )
    optimizerMocks.runOptimizeDeps.mockReturnValue({
      cancel: () => Promise.resolve(),
      result: new Promise(() => {}),
    })
    const environment = createEnvironment()
    const optimizer = createDepsOptimizer(environment)

    await optimizer.init()
    const scanProcessing = optimizer.scanProcessing
    expect(scanProcessing).toBeDefined()

    await vi.advanceTimersByTimeAsync(999)
    expect(environment.logger.info).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(environment.logger.info).toHaveBeenCalledOnce()
    expect(environment.logger.info).toHaveBeenCalledWith(
      '[optimizer] scanning dependencies...',
      { timestamp: true },
    )

    resolveDiscovery({})
    await scanProcessing
    expect(vi.getTimerCount()).toBe(0)
    await optimizer.close()
  })
})
