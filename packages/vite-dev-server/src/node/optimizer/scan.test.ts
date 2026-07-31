import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import type { Plugin } from '../plugin'

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

import { createEnvironmentPluginContainer } from '../server/pluginContainer'
import { type ScanEnvironment, scanImports } from './scan'

let root: string

beforeEach(() => {
  root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-optimizer-scan-')),
  )
})

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true })
})

function createScanEnvironment(buildInput?: unknown) {
  const warn = vi.fn<(...args: unknown[]) => void>()
  const resolveId = vi.fn<(...args: unknown[]) => Promise<null>>(
    async () => null,
  )
  const config = {
    build: {
      outDir: 'dist',
      rolldownOptions: { input: buildInput },
    },
    consumer: 'client',
    esbuild: false,
    isProduction: false,
    optimizeDeps: {
      entries: undefined,
      exclude: [],
      extensions: [],
      include: undefined,
      rolldownOptions: {},
    },
    root,
    server: {
      perEnvironmentStartEndDuringDev: false,
    },
  } as unknown as ResolvedConfig
  const environment = {
    config,
    logger: { warn },
    mode: 'scan',
    name: 'client',
    pluginContainer: { resolveId },
  } as unknown as ScanEnvironment

  return { environment, warn }
}

describe('scanImports', () => {
  it('refers to rolldownOptions when entries cannot be inferred', async () => {
    const { environment, warn } = createScanEnvironment()

    await expect(scanImports(environment).result).resolves.toEqual({
      deps: {},
      missing: {},
    })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('rolldownOptions'),
    )
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('rollupOptions'),
    )
  })

  it('refers to rolldownOptions when build input cannot be resolved', async () => {
    const input = 'missing.ts'
    const { environment } = createScanEnvironment(input)

    await expect(scanImports(environment).result).rejects.toThrow(
      `failed to resolve rolldownOptions.input value: ${JSON.stringify(input)}.`,
    )
  })

  it('refers to rolldownOptions when build input is invalid', async () => {
    const { environment } = createScanEnvironment(42)

    await expect(scanImports(environment).result).rejects.toThrow(
      'invalid rolldownOptions.input value.',
    )
  })

  it('resolves build input relative to the project root', async () => {
    const input = 'entry-client.ts'
    fs.writeFileSync(path.join(root, input), '')

    const resolveId = vi.fn<
      (id: string, importer: string | undefined) => string | null
    >(
      (id: string, importer: string | undefined): string | null => {
        if (!importer) {
          return null
        }
        return path.resolve(path.dirname(importer), id)
      },
    )
    const resolver: Plugin = {
      name: 'test:root-entry-resolver',
      resolveId,
    }
    const warn = vi.fn<(...args: unknown[]) => void>()
    const config = {
      build: {
        rolldownOptions: { input },
      },
      consumer: 'client',
      esbuild: false,
      isProduction: false,
      optimizeDeps: {
        entries: undefined,
        exclude: [],
        extensions: [],
        include: undefined,
        rolldownOptions: {},
      },
      root,
      server: {
        perEnvironmentStartEndDuringDev: false,
      },
    } as unknown as ResolvedConfig
    const environment = {
      config,
      getTopLevelConfig: () => config,
      logger: { warn },
      mode: 'scan',
      name: 'client',
      plugins: [resolver],
    } as unknown as ScanEnvironment
    const pluginContainer = await createEnvironmentPluginContainer(
      environment,
      [resolver],
      undefined,
      false,
    )
    Object.defineProperty(environment, 'pluginContainer', {
      value: pluginContainer,
    })

    try {
      await expect(scanImports(environment).result).resolves.toEqual({
        deps: {},
        missing: {},
      })
      expect(resolveId.mock.calls[0]?.[0]).toBe(input)
      expect(resolveId.mock.calls[0]?.[1]).toBe(path.join(root, 'index.html'))
      expect(warn).not.toHaveBeenCalled()
    } finally {
      await pluginContainer.close()
    }
  })
})
