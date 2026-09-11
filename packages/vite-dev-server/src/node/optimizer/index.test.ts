import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import type { Environment } from '../environment'
import type { OptimizedDepInfo } from './index'
import { getHash } from '../utils'

type FakeRolldownOutput = {
  output: []
}

type FakeRolldownGenerateOutput = {
  output: [{ code: string }]
}

const rolldownMocks = vi.hoisted(() => ({
  close: vi.fn<() => Promise<void>>(),
  generate: vi.fn<(...args: unknown[]) => Promise<FakeRolldownGenerateOutput>>(),
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

import { extractExportsData, initDepsOptimizerMetadata, runOptimizeDeps } from './index'

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
  rolldownMocks.generate.mockReset().mockResolvedValue({
    output: [{ code: 'export const value = 42; export default value;' }],
  })
  rolldownMocks.rolldown.mockReset()
  rolldownMocks.write.mockReset()
  rolldownMocks.close.mockResolvedValue()
  rolldownMocks.rolldown.mockResolvedValue({
    close: rolldownMocks.close,
    generate: rolldownMocks.generate,
    write: rolldownMocks.write,
  })
})

afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('initDepsOptimizerMetadata', () => {
  it('prefers a popular lockfile when the package manager is unknown', () => {
    const packageLock = '{"lockfileVersion":3}'
    fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true })
    fs.writeFileSync(
      path.join(root, 'node_modules/.package-lock.json'),
      packageLock,
    )
    fs.writeFileSync(path.join(root, '.pnp.cjs'), 'deprecated lockfile')

    const metadata = initDepsOptimizerMetadata(createEnvironment())

    expect(metadata.lockfileHash).toBe(getHash(packageLock))
  })

  it('uses an Aube lockfile in dependency metadata', () => {
    const aubeLock = 'lockfileVersion: 1'
    fs.writeFileSync(path.join(root, 'aube-lock.yaml'), aubeLock)

    const metadata = initDepsOptimizerMetadata(createEnvironment())

    expect(metadata.lockfileHash).toBe(getHash(aubeLock))
  })

  it('uses a Nub lockfile in dependency metadata', () => {
    const nubLock = 'lockfileVersion: 9'
    fs.writeFileSync(path.join(root, 'nub.lock'), nubLock)

    const metadata = initDepsOptimizerMetadata(createEnvironment())

    expect(metadata.lockfileHash).toBe(getHash(nubLock))
  })

  it('includes a Nub patches directory timestamp in dependency metadata', () => {
    const nubLock = 'lockfileVersion: 9'
    const patchesDir = path.join(root, 'patches')
    fs.writeFileSync(path.join(root, 'nub.lock'), nubLock)
    fs.mkdirSync(patchesDir)
    fs.utimesSync(patchesDir, new Date(0), new Date(0))
    const patchesMtime = fs.statSync(patchesDir).mtimeMs

    const metadata = initDepsOptimizerMetadata(createEnvironment())

    expect(metadata.lockfileHash).toBe(
      getHash(nubLock + patchesMtime.toString()),
    )
  })
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

describe('extractExportsData custom extension bundle lifecycle', () => {
  let environment: Environment
  let filePath: string

  beforeEach(() => {
    environment = createEnvironment({ comments: { legal: false } })
    environment.config.optimizeDeps.extensions = ['.custom']
    filePath = path.join(root, 'entry.custom')
  })

  it.each([
    {
      kind: 'ESM',
      code: 'export const value = 42; export default value;',
      expected: { hasModuleSyntax: true, exports: ['value', 'default'] },
    },
    {
      kind: 'CommonJS',
      code: 'module.exports = { value: 42 };',
      expected: { hasModuleSyntax: false, exports: [] },
    },
  ])('closes once after analyzing $kind output', async ({ code, expected }) => {
    rolldownMocks.generate.mockResolvedValue({ output: [{ code }] })

    await expect(extractExportsData(environment, filePath)).resolves.toEqual(expected)
    expect(rolldownMocks.rolldown).toHaveBeenCalledExactlyOnceWith({
      output: { comments: { legal: false } },
      plugins: [expect.objectContaining({ name: 'externalize' })],
      input: [filePath],
      moduleTypes: { '.css': 'js' },
    })
    expect(rolldownMocks.generate).toHaveBeenCalledExactlyOnceWith({
      comments: { legal: false },
      format: 'esm',
      sourcemap: false,
    })
    expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
    expect(rolldownMocks.generate.mock.invocationCallOrder[0]).toBeLessThan(
      rolldownMocks.close.mock.invocationCallOrder[0],
    )
    expect(rolldownMocks.write).not.toHaveBeenCalled()
  })

  it('waits for close before returning the analyzed exports', async () => {
    const closing = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    rolldownMocks.close.mockImplementationOnce(() => {
      started.resolve()
      return closing.promise
    })
    let settled = false
    const result = extractExportsData(environment, filePath).finally(() => {
      settled = true
    })
    try {
      await Promise.race([started.promise, result])
      expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
      expect(settled).toBe(false)
    } finally {
      closing.resolve()
      await result
    }
    await expect(result).resolves.toEqual({
      hasModuleSyntax: true,
      exports: ['value', 'default'],
    })
    expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
  })

  it('closes once when generate rejects and preserves the original error', async () => {
    const error = new Error('generate failed')
    rolldownMocks.generate.mockRejectedValueOnce(error)

    await expect(extractExportsData(environment, filePath)).rejects.toBe(error)
    expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
  })

  it('closes once when es-module-lexer rejects the generated code', async () => {
    rolldownMocks.generate.mockResolvedValueOnce({ output: [{ code: 'export {' }] })

    await expect(extractExportsData(environment, filePath)).rejects.toThrow('Parse error')
    expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
  })

  it.each(['success', 'generate failure', 'parse failure'])(
    'propagates close failure after %s',
    async outcome => {
      if (outcome === 'generate failure') {
        rolldownMocks.generate.mockRejectedValueOnce(new Error('generate failed'))
      } else if (outcome === 'parse failure') {
        rolldownMocks.generate.mockResolvedValueOnce({ output: [{ code: 'export {' }] })
      }
      const error = new Error('close failed')
      rolldownMocks.close.mockRejectedValueOnce(error)

      await expect(extractExportsData(environment, filePath)).rejects.toBe(error)
      expect(rolldownMocks.close).toHaveBeenCalledExactlyOnceWith()
    },
  )

  it('does not generate or close a bundle when its creation fails', async () => {
    const error = new Error('creation failed')
    rolldownMocks.rolldown.mockRejectedValueOnce(error)

    await expect(extractExportsData(environment, filePath)).rejects.toBe(error)
    expect(rolldownMocks.generate).not.toHaveBeenCalled()
    expect(rolldownMocks.close).not.toHaveBeenCalled()
  })

  it('keeps ordinary JavaScript analysis independent of a bundle', async () => {
    const jsPath = path.join(root, 'entry.js')
    fs.writeFileSync(jsPath, 'export const value = 42;')

    await expect(extractExportsData(environment, jsPath)).resolves.toEqual({
      hasModuleSyntax: true,
      exports: ['value'],
      jsxLoader: false,
    })
    expect(rolldownMocks.rolldown).not.toHaveBeenCalled()
    expect(rolldownMocks.generate).not.toHaveBeenCalled()
    expect(rolldownMocks.close).not.toHaveBeenCalled()
  })
})
