import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import type { Environment } from '../environment'
import type { OptimizedDepInfo } from './index'

type FakeRolldownOutput = {
  output: []
}

const rolldownMocks = vi.hoisted(() => ({
  close: vi.fn<() => Promise<void>>(),
  rolldown: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  write: vi.fn<(...args: unknown[]) => Promise<FakeRolldownOutput>>(),
}))

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: rolldownMocks.rolldown,
}))

vi.mock('../plugins/oxc', () => ({
  transformWithOxc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('./rolldownDepPlugin', () => ({
  rolldownCjsExternalPlugin: vi.fn<(...args: unknown[]) => unknown>(),
  rolldownDepPlugin: vi.fn<(...args: unknown[]) => []>(() => []),
}))

vi.mock('./scan', () => ({
  ScanEnvironment: class {},
  scanImports: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('./resolve', () => ({
  createOptimizeDepsIncludeResolver:
    vi.fn<(...args: unknown[]) => unknown>(),
  expandGlobIds: vi.fn<(...args: unknown[]) => string[]>(() => []),
}))

import { runOptimizeDeps } from './index'

let root: string

function createEnvironment(
  output: Record<string, unknown> = {},
): Environment {
  const config = {
    assetsInclude: () => false,
    cacheDir: path.join(root, 'node_modules/.vite'),
    consumer: 'client',
    createResolver: () => async () => undefined,
    isProduction: false,
    keepProcessEnv: false,
    mode: 'development',
    optimizeDeps: {
      exclude: [],
      extensions: [],
      rolldownOptions: { output },
    },
    optimizeDepsPluginNames: [],
    plugins: [],
    resolve: {
      builtins: [],
    },
    root,
    ssr: {
      target: 'webworker',
    },
  } as unknown as ResolvedConfig

  return {
    config,
    getTopLevelConfig: () => config,
    logger: {
      info: vi.fn<(...args: unknown[]) => void>(),
    },
    name: 'client',
  } as unknown as Environment
}

function createDepsInfo(): Record<string, OptimizedDepInfo> {
  const id = 'example'
  return {
    [id]: {
      browserHash: 'browser-hash',
      exportsData: Promise.resolve({
        exports: ['value'],
        hasModuleSyntax: true,
      }),
      file: path.join(root, 'node_modules/.vite/deps/example.js'),
      id,
      src: path.join(root, 'example.js'),
    },
  }
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-optimizer-'))
  rolldownMocks.close.mockReset()
  rolldownMocks.rolldown.mockReset()
  rolldownMocks.write.mockReset()
  rolldownMocks.close.mockResolvedValue()
  rolldownMocks.rolldown.mockResolvedValue({
    close: rolldownMocks.close,
    write: rolldownMocks.write,
  })
})

afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('runOptimizeDeps bundle lifecycle', () => {
  it('forwards comment options without a deprecated default', async () => {
    const comments = { legal: false }
    rolldownMocks.write.mockResolvedValue({ output: [] })

    const result = await runOptimizeDeps(
      createEnvironment({ comments }),
      createDepsInfo(),
    ).result

    const outputOptions = rolldownMocks.write.mock.calls[0]?.[0]
    expect(outputOptions).not.toHaveProperty('legalComments')
    expect(outputOptions).toHaveProperty('comments', comments)
    await result.cancel()
  })

  it('closes the bundle after a successful write', async () => {
    rolldownMocks.write.mockResolvedValue({ output: [] })

    const result = await runOptimizeDeps(
      createEnvironment(),
      createDepsInfo(),
    ).result

    expect(rolldownMocks.write).toHaveBeenCalledOnce()
    expect(rolldownMocks.close).toHaveBeenCalledOnce()
    expect(rolldownMocks.write.mock.invocationCallOrder[0]).toBeLessThan(
      rolldownMocks.close.mock.invocationCallOrder[0],
    )
    result.cancel()
  })

  it('closes the bundle when write rejects', async () => {
    rolldownMocks.write.mockRejectedValue(new Error('write failed'))

    await expect(
      runOptimizeDeps(createEnvironment(), createDepsInfo()).result,
    ).rejects.toThrow('Error during dependency optimization:\n\nwrite failed')

    expect(rolldownMocks.write).toHaveBeenCalledOnce()
    expect(rolldownMocks.close).toHaveBeenCalledOnce()
    expect(rolldownMocks.write.mock.invocationCallOrder[0]).toBeLessThan(
      rolldownMocks.close.mock.invocationCallOrder[0],
    )
  })

  it('logs when bundling takes longer than one second', async () => {
    vi.useFakeTimers()
    let resolveWrite!: (output: FakeRolldownOutput) => void
    let resolveWriteStarted!: () => void
    const writeStarted = new Promise<void>((resolve) => {
      resolveWriteStarted = resolve
    })
    rolldownMocks.write.mockImplementation(() => {
      resolveWriteStarted()
      return new Promise((resolve) => {
        resolveWrite = resolve
      })
    })
    const environment = createEnvironment()

    const optimization = runOptimizeDeps(environment, createDepsInfo())
    await writeStarted

    await vi.advanceTimersByTimeAsync(999)
    expect(environment.logger.info).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(environment.logger.info).toHaveBeenCalledOnce()
    expect(environment.logger.info).toHaveBeenCalledWith(
      '[optimizer] bundling dependencies...',
      { timestamp: true },
    )

    resolveWrite({ output: [] })
    const result = await optimization.result
    expect(vi.getTimerCount()).toBe(0)
    await result.cancel()
  })
})
