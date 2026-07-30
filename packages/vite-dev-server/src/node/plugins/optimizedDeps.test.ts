import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { LoadResult, PluginContext } from 'rolldown'
import type { DevEnvironment } from '../server/environment'
import type { Plugin } from '../plugin'

const fsPromises = vi.hoisted(() => ({
  readFile: vi.fn<(filePath: string, encoding: string) => Promise<string>>(),
}))

const optimizer = vi.hoisted(() => ({
  isDepOptimizationDisabled: vi.fn<() => boolean>(),
  optimizedDepInfoFromFile: vi.fn<() => undefined>(),
}))

vi.mock('node:fs/promises', () => ({
  default: fsPromises,
}))

vi.mock('../optimizer', () => optimizer)

import { optimizedDepsPlugin } from './optimizedDeps'

type LoadHandler = (
  this: PluginContext,
  id: string,
) => LoadResult | Promise<LoadResult>

function getLoadHandler(plugin: Plugin): LoadHandler {
  const hook = plugin.load
  if (!hook) {
    throw new Error(`Plugin "${plugin.name}" has no load hook`)
  }
  return typeof hook === 'function' ? hook : hook.handler
}

function createEnvironment(isBundled = false): DevEnvironment {
  const config = {
    isBundled,
    optimizeDeps: {
      disabled: false,
      ignoreOutdatedRequests: false,
    },
  }
  return {
    config,
    depsOptimizer: {
      metadata: {},
      isOptimizedDepFile: () => true,
    },
  } as unknown as DevEnvironment
}

function createContext(environment: DevEnvironment): PluginContext {
  return { environment } as unknown as PluginContext
}

beforeEach(() => {
  vi.clearAllMocks()
  optimizer.isDepOptimizationDisabled.mockReturnValue(false)
  optimizer.optimizedDepInfoFromFile.mockReturnValue(undefined)
})

describe('optimizedDepsPlugin', () => {
  it('does not apply to bundled environments', () => {
    const plugin = optimizedDepsPlugin()

    expect(plugin.applyToEnvironment?.(createEnvironment(true))).toBe(false)
    expect(optimizer.isDepOptimizationDisabled).not.toHaveBeenCalled()
  })

  it('does not apply when dependency optimization is disabled', () => {
    optimizer.isDepOptimizationDisabled.mockReturnValue(true)
    const plugin = optimizedDepsPlugin()

    expect(plugin.applyToEnvironment?.(createEnvironment())).toBe(false)
  })

  it('applies when dependency optimization is enabled', () => {
    const plugin = optimizedDepsPlugin()

    expect(plugin.applyToEnvironment?.(createEnvironment())).toBe(true)
  })

  it('returns an optimized dependency with its source map', async () => {
    const file = '/cache/deps/example.js'
    const code = 'export const value = 1'
    const map = {
      version: 3,
      sources: ['example.ts'],
      names: [],
      mappings: 'AAAA',
    }
    fsPromises.readFile.mockImplementation(async (filePath) => {
      if (filePath === file) {
        return code
      }
      if (filePath === `${file}.map`) {
        return JSON.stringify(map)
      }
      throw new Error(`Unexpected path: ${filePath}`)
    })
    const plugin = optimizedDepsPlugin()
    const load = getLoadHandler(plugin)

    await expect(
      load.call(createContext(createEnvironment()), `${file}?v=current`),
    ).resolves.toEqual({ code, map })
  })

  it('returns code when the source map is missing', async () => {
    const file = '/cache/deps/example.js'
    const code = 'export const value = 1'
    fsPromises.readFile.mockImplementation(async (filePath) => {
      if (filePath === file) {
        return code
      }
      throw new Error('ENOENT')
    })
    const plugin = optimizedDepsPlugin()
    const load = getLoadHandler(plugin)

    await expect(
      load.call(createContext(createEnvironment()), file),
    ).resolves.toBe(code)
  })

  it('returns code when the source map is malformed', async () => {
    const file = '/cache/deps/example.js'
    const code = 'export const value = 1'
    fsPromises.readFile.mockImplementation(async (filePath) => {
      if (filePath === file) {
        return code
      }
      if (filePath === `${file}.map`) {
        return '{invalid'
      }
      throw new Error(`Unexpected path: ${filePath}`)
    })
    const plugin = optimizedDepsPlugin()
    const load = getLoadHandler(plugin)

    await expect(
      load.call(createContext(createEnvironment()), file),
    ).resolves.toBe(code)
  })
})
