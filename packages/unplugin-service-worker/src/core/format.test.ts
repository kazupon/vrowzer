import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ServiceWorkerPlugin } from '../index.ts'

import type { OutputChunk } from 'rolldown'
import type { Options } from './options.ts'

vi.mock('rolldown', async importOriginal => {
  const actual = await importOriginal<typeof import('rolldown')>()
  return { ...actual, rolldown: vi.fn<typeof actual.rolldown>() }
})

type Bundle = Awaited<ReturnType<typeof rolldown>>
type Hook = (this: unknown, ...args: unknown[]) => unknown
type EsbuildCallback = (args: Record<string, unknown>) => unknown

interface RawPlugin {
  buildStart: Hook
  vite: { configResolved: Hook; generateBundle: Hook }
  esbuild: { setup: (build: unknown) => void }
  farm: { finish: { executor: Hook } }
}

const swCode = 'self.sw = true'
const generate =
  vi.fn<(...args: Parameters<Bundle['generate']>) => Promise<{ output: OutputChunk[] }>>()
const close = vi.fn<Bundle['close']>()
let root: string
let swPath: string

function createPlugin(framework: 'vite' | 'esbuild' | 'farm', options: Options): RawPlugin {
  return ServiceWorkerPlugin.raw(options, { framework } as never) as unknown as RawPlugin
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'unplugin-service-worker-format-'))
  swPath = path.join(root, 'src', 'sw.js')
  await mkdir(path.join(root, 'src'), { recursive: true })
  await mkdir(path.join(root, 'dist'), { recursive: true })
  await writeFile(swPath, swCode)
  // Farm locates its output directory by looking for built JS files
  await writeFile(path.join(root, 'dist', 'main.js'), 'console.log(1)')

  generate.mockReset().mockResolvedValue({
    output: [{ type: 'chunk', isEntry: true, code: swCode } as OutputChunk]
  })
  close.mockReset().mockResolvedValue(undefined)
  vi.mocked(rolldown)
    .mockReset()
    .mockResolvedValue({ generate, close } as unknown as Bundle)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe.each([
  { format: undefined, expected: 'iife' },
  { format: 'esm', expected: 'esm' }
] as const)('Service Worker bundle format ($expected)', ({ format, expected }) => {
  it('is used by the Vite generateBundle fallback', async () => {
    const plugin = createPlugin('vite', { entry: swPath, format })
    await plugin.vite.configResolved.call(undefined, {
      command: 'build',
      mode: 'production',
      root,
      base: '/',
      plugins: [],
      build: { minify: false, sourcemap: false, assetsDir: 'assets' }
    })
    plugin.buildStart.call(undefined)
    const emitFile = vi.fn<(file: Record<string, unknown>) => string>()

    await plugin.vite.generateBundle.call({ emitFile }, {}, {})

    expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ format: expected }))
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'asset', source: swCode })
    )
  })

  it('is used by the esbuild onEnd hook', async () => {
    const onLoad = vi.fn<(options: unknown, callback: EsbuildCallback) => void>()
    const onEnd = vi.fn<(callback: EsbuildCallback) => void>()
    const outdir = path.join(root, 'out')
    const importer = path.join(root, 'src', 'main.js')
    await writeFile(
      importer,
      "createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })"
    )
    createPlugin('esbuild', { format }).esbuild.setup({ initialOptions: { outdir }, onLoad, onEnd })

    await onLoad.mock.calls[0]![1]({ path: importer })
    await onEnd.mock.calls[0]![0]({})

    expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ format: expected }))
    expect(await readdir(outdir)).toContainEqual(expect.stringMatching(/^sw-.+\.js$/))
  })

  it('is used by the Farm finish hook', async () => {
    const plugin = createPlugin('farm', { entry: swPath, format })
    plugin.buildStart.call(undefined)

    await plugin.farm.finish.executor.call(undefined)

    expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ format: expected }))
  })
})
