import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rolldown } from 'rolldown'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { prebundleWorkerConfig, resolveOutputDir } from './prebundle.ts'

import type { MockInstance } from 'vite-plus/test'

vi.mock('rolldown', async importOriginal => {
  const actual = await importOriginal<typeof import('rolldown')>()
  return { ...actual, rolldown: vi.fn<typeof actual.rolldown>(actual.rolldown) }
})

const directories: string[] = []

function fixture(files: Record<string, string>) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'vrowzer-prebundle-')))
  directories.push(root)
  const write = (file: string, source: string) => {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, source)
    return path
  }
  for (const [file, source] of Object.entries(files)) {
    write(file, source)
  }
  return { root, write, entry: join(root, 'config/worker.ts') }
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('real worker config prebundle', () => {
  test.each([false, true])(
    'closes the real Rolldown bundle with generation failure=%s',
    async fail => {
      const { root, entry } = fixture({
        'config/worker.ts': `import { value } from './helper.ts'; export default { value }`,
        'config/helper.ts': fail ? 'export const value = {' : 'export const value = 42'
      })
      const actual = await vi.importActual<typeof import('rolldown')>('rolldown')
      let close: MockInstance | undefined
      vi.mocked(rolldown).mockImplementationOnce(async options => {
        const bundle = await actual.rolldown(options)
        close = vi.spyOn(bundle, 'close')
        return bundle
      })
      const result = prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
      if (fail) {
        await expect(result).rejects.toThrow(/helper\.ts/)
      } else {
        await expect(result).resolves.toHaveProperty('path')
      }
      expect(close).toHaveBeenCalledExactlyOnceWith()
      expect(close?.mock.settledResults).toEqual([{ type: 'fulfilled', value: undefined }])
    }
  )

  test('tracks a bare workspace import and its inline data through a package symlink', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `import { value } from 'worker-helper'; export default { define: { value } }`,
      'packages/helper/package.json':
        '{"name":"worker-helper","type":"module","exports":"./index.ts"}',
      'packages/helper/index.ts': `
        import { readFileSync } from 'node:fs'
        export const value = readFileSync(new URL('./value.txt', import.meta.url), 'utf8')
      `,
      'packages/helper/value.txt': 'workspace data',
      'node_modules/.keep': ''
    })
    symlinkSync(join(root, 'packages/helper'), join(root, 'node_modules/worker-helper'), 'dir')
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    expect((await import(pathToFileURL(result.path).href)).default.define.value).toBe(
      'workspace data'
    )
    expect(result.dependencies).toEqual(
      [
        entry,
        join(root, 'packages/helper/index.ts'),
        join(root, 'packages/helper/value.txt')
      ].sort()
    )
  })

  test('bundles defineConfig and aliases without importing the heavy Vite runtime', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `
        import { defineConfig as config, type UserConfig } from 'vite'
        import { helper } from './helper.ts'
        const result = config({ define: { value: helper({ value: 42 }).value } } satisfies UserConfig)
        export default result
      `,
      'config/helper.ts': `import { defineConfig as helper } from 'vite'; export { helper }`
    })
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    expect((await import(pathToFileURL(result.path).href)).default.define.value).toBe(42)
    const code = readFileSync(result.path, 'utf8')
    expect(code).not.toContain('@vrowzer/vite-dev-server')
    expect(code).not.toContain('WebAssembly')
  })

  test('preserves local imports, plugin options, functions and config fields', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `
        import { plugin, options } from './helper.ts'
        const extra = [plugin(options)]
        export default {
          plugins: [...extra],
          define: { __PREVIEW__: 'true' },
          html: { cspNonce: 'preview' },
          server: { forwardConsole: false },
          resolve: { alias: [{ find: /^preview-/, replacement: '/vendor/' }], dedupe: ['svelte'] }
        }
      `,
      'config/helper.ts': `
        export const options = { compilerOptions: { dev: true } }
        export const plugin = options => ({ name: 'preview', config: () => options })
      `
    })
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    const { default: config } = await import(pathToFileURL(result.path).href)
    expect(config.plugins[0].config()).toEqual({ compilerOptions: { dev: true } })
    expect(config).toMatchObject({
      define: { __PREVIEW__: 'true' },
      html: { cspNonce: 'preview' },
      server: { forwardConsole: false },
      resolve: { dedupe: ['svelte'] }
    })
    expect(config.resolve.alias[0].find.test('preview-lib')).toBe(true)
    expect(result.dependencies).toEqual([join(root, 'config/helper.ts'), entry].sort())
    expect(existsSync(join(resolveOutputDir(root), '_entry.mts'))).toBe(false)
  })

  test('records local inline data and keeps each module location', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `
        import { text, json, location } from '../preview/helper.ts'
        export default { define: { text, json: JSON.stringify(json), location } }
      `,
      'preview/helper.ts': `
        import { readFileSync as read } from 'node:fs'
        import { resolve as path } from 'node:path'
        import { createRequire as requireFrom } from 'node:module'
        export const text = read(path(import.meta.dirname, './data.txt'), 'utf8')
        export const json = requireFrom(import.meta.url)('./data.json')
        export const location = import.meta.filename
      `,
      'preview/data.txt': 'preview text',
      'preview/data.json': '{"flag":true}'
    })
    const result = await prebundleWorkerConfig({
      root,
      configDir: '/wrong-host-path',
      workerConfig: entry
    })
    const { default: config } = await import(pathToFileURL(result.path).href)
    expect(config.define).toEqual({
      text: 'preview text',
      json: '{"flag":true}',
      location: join(root, 'preview/helper.ts')
    })
    expect(result.dependencies).toEqual(
      [
        entry,
        join(root, 'preview/helper.ts'),
        join(root, 'preview/data.txt'),
        join(root, 'preview/data.json')
      ].sort()
    )
    expect(result.dependencies.every(path => !path.includes('/node_modules/.vrowzer/'))).toBe(true)
  })

  test('inlines a helper with unaliased reads and a chained string operation', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `import { compilerOptions, marker } from './helper.ts'; export default { compilerOptions, marker }`,
      'config/helper.ts': `
        import { readFileSync } from 'node:fs'
        import { createRequire } from 'node:module'
        export const compilerOptions = createRequire(import.meta.url)('./options.json')
        export const marker = readFileSync(new URL('./marker.txt', import.meta.url), 'utf8').trim()
      `,
      'config/options.json': '{"preserveWhitespace":true}',
      'config/marker.txt': 'worker define\n'
    })
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    expect((await import(pathToFileURL(result.path).href)).default).toEqual({
      compilerOptions: { preserveWhitespace: true },
      marker: 'worker define'
    })
  })

  test('uses the host directory for generated source imports and file reads', async () => {
    const { root } = fixture({
      'config/helper.ts': 'export const value = 42',
      'config/data.txt': 'host source data'
    })
    const result = await prebundleWorkerConfig({
      root,
      configDir: join(root, 'config'),
      workerSource: `
        import { value } from './helper.ts'
        import { readFileSync } from 'node:fs'
        export default { define: { value, text: readFileSync('./data.txt', 'utf-8') } }
      `
    })
    expect((await import(pathToFileURL(result.path).href)).default.define).toEqual({
      value: 42,
      text: 'host source data'
    })
    expect(result.dependencies).toEqual([
      join(root, 'config/data.txt'),
      join(root, 'config/helper.ts')
    ])
  })

  test('uses the original host filename for generated source URLs and require anchors', async () => {
    const { root } = fixture({
      'config/data.txt': 'host text',
      'config/data.json': '{"origin":"host"}'
    })
    const sourcePath = join(root, 'config/custom.vite.config.ts')
    const result = await prebundleWorkerConfig({
      root,
      configDir: dirname(sourcePath),
      sourcePath,
      workerSource: `
        import { readFileSync } from 'node:fs'
        import { createRequire } from 'node:module'
        export default {
          text: readFileSync(new URL('./data.txt', import.meta.url), 'utf8'),
          data: createRequire(import.meta.url)('./data.json'),
          url: import.meta.url,
          filename: import.meta.filename
        }
      `
    })
    expect((await import(pathToFileURL(result.path).href)).default).toEqual({
      text: 'host text',
      data: { origin: 'host' },
      url: pathToFileURL(sourcePath).href,
      filename: sourcePath
    })
  })

  test('recognizes a generated entry under a symlinked root', async () => {
    const { root } = fixture({
      'config/helper.ts': 'export const value = 42',
      'config/data.txt': 'symlink data'
    })
    const linked = join(root, 'linked-config')
    symlinkSync(join(root, 'config'), linked, 'dir')
    const result = await prebundleWorkerConfig({
      root: linked,
      configDir: linked,
      workerSource: `
        import { value } from './helper.ts'
        import { readFileSync } from 'node:fs'
        export default { define: { value, text: readFileSync('./data.txt', 'utf8') } }
      `
    })
    expect((await import(pathToFileURL(result.path).href)).default.define).toEqual({
      value: 42,
      text: 'symlink data'
    })
    expect(result.dependencies).not.toEqual(
      expect.arrayContaining([expect.stringContaining('/.vrowzer/')])
    )
  })

  test.each(['vite-plus', '@vrowzer/vite-plugin', '@vrowzer/vite-plugin/subpath'])(
    'rejects the runtime import %s through a local helper',
    async dependency => {
      const { root, entry } = fixture({
        'config/worker.ts': `import './helper.ts'; export default {}`,
        'config/helper.ts': `import '${dependency}'`
      })
      await expect(
        prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
      ).rejects.toThrow(`Cannot import ${dependency} in workerConfig`)
    }
  )

  test('allows type-only imports from the host toolchain', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `
        import type { UserConfig } from 'vite-plus'
        import type { VrowzerOptions } from '@vrowzer/vite-plugin'
        const config = { plugins: [] } satisfies UserConfig
        export default config
      `
    })
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    expect((await import(pathToFileURL(result.path).href)).default).toEqual({ plugins: [] })
  })

  test('does not execute the config on the host', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `throw new Error('do not evaluate'); export default { plugins: [] }`
    })
    const result = await prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    expect(readFileSync(result.path, 'utf8')).toContain('do not evaluate')
  })

  test('prebundles the dedicated Svelte config used by the embedding fixture', async () => {
    const { root } = fixture({})
    const entry = resolve(
      import.meta.dirname,
      '../../../e2e/vite-worker-config/vrowzer.worker.config.ts'
    )
    const result = await prebundleWorkerConfig({
      root,
      configDir: dirname(entry),
      workerConfig: entry
    })
    expect(result.dependencies).toContain(resolve(dirname(entry), 'preview/marker.txt'))
    expect(result.dependencies).toContain(resolve(dirname(entry), 'preview/compiler-options.json'))
    expect(readFileSync(result.path, 'utf8')).toContain('worker define')
  })

  test('keeps the previous entry and hashed chunks when regeneration fails', async () => {
    const { root, entry, write } = fixture({
      'config/worker.ts': `export default { load: () => import('./lazy.ts') }`,
      'config/lazy.ts': 'export default "first"'
    })
    const options = { root, configDir: root, workerConfig: entry }
    const result = await prebundleWorkerConfig(options)
    const previous = readFileSync(result.path, 'utf8')
    const chunksDirectory = join(resolveOutputDir(root), 'chunks')
    const [chunk] = readdirSync(chunksDirectory)
    expect(chunk).toMatch(/^lazy-.+\.mjs$/)
    const previousChunk = readFileSync(join(chunksDirectory, chunk!), 'utf8')
    write('config/lazy.ts', 'export default {')
    await expect(prebundleWorkerConfig(options)).rejects.toThrow()
    expect(readFileSync(result.path, 'utf8')).toBe(previous)
    expect(readFileSync(join(chunksDirectory, chunk!), 'utf8')).toBe(previousChunk)
    write('config/lazy.ts', 'export default "second"')
    await prebundleWorkerConfig(options)
    expect(readFileSync(result.path, 'utf8')).not.toBe(previous)
    expect(readFileSync(join(chunksDirectory, chunk!), 'utf8')).toBe(previousChunk)
    expect(readdirSync(chunksDirectory)).toHaveLength(2)
    expect(readdirSync(resolveOutputDir(root)).some(name => name.startsWith('.tmp-'))).toBe(false)
  })

  test('rejects a missing local import instead of leaving an external import', async () => {
    const { root, entry } = fixture({
      'config/worker.ts': `import { plugin } from './missing.ts'; export default { plugins: [plugin()] }`
    })
    await expect(
      prebundleWorkerConfig({ root, configDir: root, workerConfig: entry })
    ).rejects.toThrow()
  })
})
