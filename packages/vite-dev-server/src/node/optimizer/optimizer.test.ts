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
  discoverProjectDependencies: () => ({
    cancel: () => Promise.resolve(),
    result: Promise.resolve({}),
  }),
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
  } as unknown as DevEnvironment
}

beforeEach(() => {
  vi.useFakeTimers()
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
})
