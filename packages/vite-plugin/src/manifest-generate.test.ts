import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { bundleCjsPackages, generateManifest, toBuildExports } from './manifest-generate.ts'

import type { MockInstance } from 'vite-plus/test'

vi.mock('rolldown', async importOriginal => {
  const actual = await importOriginal<typeof import('rolldown')>()
  return { ...actual, rolldown: vi.fn<typeof actual.rolldown>() }
})

type Bundle = Awaited<ReturnType<typeof rolldown>>
const pkg = {
  name: '@fixture/cjs',
  exports: { '.': './index.js', './feature': './feature.js' }
}
const cjsPackages = [{ pkgName: pkg.name, pkg }]
// Only file names and types are consumed after write; native memory handles are not needed here.
const write =
  vi.fn<
    (
      ...args: Parameters<Bundle['write']>
    ) => Promise<{ output: { type: 'chunk' | 'asset'; fileName: string }[] }>
  >()
const close = vi.fn<Bundle['close']>()
let root: string
let sourceDir: string
let nodeModulesRoot: string
let esmDir: string
let modifiedPkgPath: string
let closeRealBundle: (() => Promise<void>) | undefined

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'vrowzer-manifest-')))
  sourceDir = join(root, 'source')
  nodeModulesRoot = join(root, 'node_modules')
  esmDir = join(nodeModulesRoot, '.vrowzer-esm')
  modifiedPkgPath = join(esmDir, 'fixture_cjs-package.json')
  write.mockReset().mockResolvedValue({
    output: [
      { type: 'chunk', fileName: 'fixture_cjs.js' },
      { type: 'chunk', fileName: 'fixture_cjs_feature.js' },
      { type: 'chunk', fileName: 'shared-a1b2.js' },
      { type: 'asset', fileName: 'ignored.txt' }
    ]
  })
  close.mockReset().mockResolvedValue(undefined)
  vi.mocked(rolldown)
    .mockReset()
    .mockResolvedValue({ write, close } as unknown as Bundle)
})

afterEach(async () => {
  try {
    await closeRealBundle?.()
  } finally {
    closeRealBundle = undefined
    vi.restoreAllMocks()
    rmSync(root, { recursive: true, force: true })
  }
})

describe('CJS manifest bundle cleanup', () => {
  test('closes once and preserves output options, manifest paths and package exports', async () => {
    const result = await bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)

    expect(write).toHaveBeenCalledExactlyOnceWith({
      format: 'esm',
      dir: esmDir,
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      minify: false
    })
    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(write.mock.invocationCallOrder[0]).toBeLessThan(close.mock.invocationCallOrder[0]!)
    expect(result.nodeModulesEntries).toEqual({
      '/node_modules/.vrowzer-esm/fixture_cjs.js': './../node_modules/.vrowzer-esm/fixture_cjs.js',
      '/node_modules/.vrowzer-esm/fixture_cjs_feature.js':
        './../node_modules/.vrowzer-esm/fixture_cjs_feature.js',
      '/node_modules/.vrowzer-esm/shared-a1b2.js': './../node_modules/.vrowzer-esm/shared-a1b2.js',
      '/node_modules/@fixture/cjs/package.json':
        './../node_modules/.vrowzer-esm/fixture_cjs-package.json'
    })
    expect(readFileSync(modifiedPkgPath, 'utf8')).toBe(
      JSON.stringify(
        {
          name: pkg.name,
          type: 'module',
          exports: {
            '.': '../.vrowzer-esm/fixture_cjs.js',
            './feature': '../.vrowzer-esm/fixture_cjs_feature.js'
          }
        },
        null,
        2
      ) + '\n'
    )
  })

  test('waits for close before writing the modified package metadata', async () => {
    const closing = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    close.mockImplementationOnce(() => {
      started.resolve()
      return closing.promise
    })
    const result = bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)
    try {
      await started.promise
      expect(existsSync(modifiedPkgPath)).toBe(false)
    } finally {
      closing.resolve()
      await result
    }
    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(existsSync(modifiedPkgPath)).toBe(true)
  })

  test('closes after write fails and preserves the original error without writing metadata', async () => {
    const error = new Error('write failed')
    write.mockRejectedValueOnce(error)

    await expect(bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)).rejects.toBe(error)
    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(existsSync(modifiedPkgPath)).toBe(false)
  })

  test.each([false, true])(
    'propagates close failure without writing metadata when write failure=%s',
    async writeFails => {
      if (writeFails) {
        write.mockRejectedValueOnce(new Error('write failed'))
      }
      const error = new Error('close failed')
      close.mockRejectedValueOnce(error)

      await expect(bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)).rejects.toBe(error)
      expect(close).toHaveBeenCalledExactlyOnceWith()
      expect(existsSync(modifiedPkgPath)).toBe(false)
    }
  )

  test('does not write or close when bundle creation fails', async () => {
    const error = new Error('creation failed')
    vi.mocked(rolldown).mockRejectedValueOnce(error)

    await expect(bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)).rejects.toBe(error)
    expect(write).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(existsSync(modifiedPkgPath)).toBe(false)
  })

  test('does not create a bundle or output directory when there are no entries', async () => {
    await expect(bundleCjsPackages([], sourceDir, nodeModulesRoot)).resolves.toEqual({
      nodeModulesEntries: {}
    })
    expect(rolldown).not.toHaveBeenCalled()
    expect(existsSync(esmDir)).toBe(false)
  })

  describe('real Rolldown output', () => {
    let realWrite: MockInstance<Bundle['write']> | undefined
    let realClose: MockInstance<Bundle['close']> | undefined

    beforeEach(async () => {
      realWrite = undefined
      realClose = undefined
      const pkgDir = join(nodeModulesRoot, pkg.name)
      mkdirSync(pkgDir, { recursive: true })
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg))
      writeFileSync(join(pkgDir, 'index.js'), 'exports.answer = 42')
      writeFileSync(join(pkgDir, 'feature.js'), 'exports.feature = "enabled"')

      const actual = await vi.importActual<typeof import('rolldown')>('rolldown')
      vi.mocked(rolldown).mockImplementationOnce(async options => {
        const bundle = await actual.rolldown(options)
        const closeBundle = bundle.close.bind(bundle)
        realWrite = vi.spyOn(bundle, 'write')
        realClose = vi.spyOn(bundle, 'close')
        closeRealBundle = async () => {
          if (!realClose?.mock.settledResults.some(result => result.type === 'fulfilled')) {
            await closeBundle()
          }
        }
        return bundle
      })
    })

    test('closes once and writes the CJS outputs referenced by the manifest', async () => {
      const { nodeModulesEntries } = await bundleCjsPackages(
        cjsPackages,
        sourceDir,
        nodeModulesRoot
      )

      expect(nodeModulesEntries['/node_modules/@fixture/cjs/package.json']).toBe(
        './../node_modules/.vrowzer-esm/fixture_cjs-package.json'
      )
      for (const file of Object.values(nodeModulesEntries)) {
        expect(existsSync(join(sourceDir, file))).toBe(true)
      }
      expect(readFileSync(join(esmDir, 'fixture_cjs.js'), 'utf8')).toContain('answer')
      expect(readFileSync(join(esmDir, 'fixture_cjs_feature.js'), 'utf8')).toContain('enabled')
      expect(realWrite).toHaveBeenCalledTimes(1)
      expect(realWrite?.mock.settledResults[0]?.type).toBe('fulfilled')
      expect(realClose).toHaveBeenCalledExactlyOnceWith()
      expect(realClose?.mock.settledResults).toEqual([{ type: 'fulfilled', value: undefined }])
    })

    test('closes once after a file output collides with a directory', async () => {
      mkdirSync(join(esmDir, 'fixture_cjs.js'), { recursive: true })

      await expect(bundleCjsPackages(cjsPackages, sourceDir, nodeModulesRoot)).rejects.toThrow(
        /fixture_cjs\.js/
      )
      expect(existsSync(modifiedPkgPath)).toBe(false)
      expect(realWrite).toHaveBeenCalledTimes(1)
      expect(realWrite?.mock.settledResults[0]?.type).toBe('rejected')
      expect(realClose).toHaveBeenCalledExactlyOnceWith()
      expect(realClose?.mock.settledResults).toEqual([{ type: 'fulfilled', value: undefined }])
    })
  })
})

describe('toBuildExports', () => {
  test('gives the ES modules to the development condition, and the original files to the others', () => {
    expect(
      toBuildExports(
        {
          '.': { 'react-server': './server.js', default: './index.js' },
          './feature': './feature.js',
          './package.json': './package.json',
          './utils/*': './utils/*.js'
        },
        {
          '.': '../.vrowzer-esm/fixture.js',
          './feature': '../.vrowzer-esm/fixture_feature.js'
        }
      )
    ).toEqual({
      '.': {
        development: '../.vrowzer-esm/fixture.js',
        default: {
          'react-server': './.vrowzer-cjs/server.js',
          default: './.vrowzer-cjs/index.js'
        }
      },
      './feature': {
        development: '../.vrowzer-esm/fixture_feature.js',
        default: './.vrowzer-cjs/feature.js'
      },
      './package.json': './.vrowzer-cjs/package.json',
      './utils/*': './.vrowzer-cjs/utils/*.js'
    })
  })

  test('takes the exports of a string and of conditions as the main entry', () => {
    expect(toBuildExports('./index.js', { '.': '../.vrowzer-esm/fixture.js' })).toEqual({
      '.': { development: '../.vrowzer-esm/fixture.js', default: './.vrowzer-cjs/index.js' }
    })
    expect(
      toBuildExports(
        { require: './index.js', default: './index.js' },
        { '.': '../.vrowzer-esm/fixture.js' }
      )
    ).toEqual({
      '.': {
        development: '../.vrowzer-esm/fixture.js',
        default: { require: './.vrowzer-cjs/index.js', default: './.vrowzer-cjs/index.js' }
      }
    })
  })
})

describe('manifests for builds', () => {
  let projectDir: string

  beforeEach(async () => {
    projectDir = join(root, 'project')
    const pkgDir = join(projectDir, 'node_modules', pkg.name)
    mkdirSync(pkgDir, { recursive: true })
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({ name: 'project', dependencies: { [pkg.name]: '1.0.0' } })
    )
    writeFileSync(join(projectDir, 'main.js'), `import '${pkg.name}'`)
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg))
    writeFileSync(join(pkgDir, 'index.js'), 'exports.answer = 42')
    writeFileSync(join(pkgDir, 'feature.js'), 'exports.feature = "enabled"')

    const actual = await vi.importActual<typeof import('rolldown')>('rolldown')
    vi.mocked(rolldown).mockImplementation(actual.rolldown)
  })

  const readPackageJsonOf = (manifest: Awaited<ReturnType<typeof generateManifest>>) =>
    JSON.parse(
      readFileSync(
        join(projectDir, manifest.nodeModules![`/node_modules/${pkg.name}/package.json`]!),
        'utf8'
      )
    )

  test('includes the original files of CommonJS packages, with the exports for builds', async () => {
    const manifest = await generateManifest({ pkgDir: projectDir, build: true }, () => {})

    expect(manifest.nodeModules).toMatchObject({
      [`/node_modules/${pkg.name}/.vrowzer-cjs/package.json`]: expect.any(String),
      [`/node_modules/${pkg.name}/.vrowzer-cjs/index.js`]: expect.any(String),
      [`/node_modules/${pkg.name}/.vrowzer-cjs/feature.js`]: expect.any(String),
      '/node_modules/.vrowzer-esm/fixture_cjs.js': expect.any(String)
    })
    const original = manifest.nodeModules![`/node_modules/${pkg.name}/.vrowzer-cjs/package.json`]!
    expect(JSON.parse(readFileSync(join(projectDir, original), 'utf8'))).toEqual(pkg)
    expect(readPackageJsonOf(manifest)).toEqual({
      name: pkg.name,
      type: 'module',
      exports: {
        '.': { development: '../.vrowzer-esm/fixture_cjs.js', default: './.vrowzer-cjs/index.js' },
        './feature': {
          development: '../.vrowzer-esm/fixture_cjs_feature.js',
          default: './.vrowzer-cjs/feature.js'
        }
      }
    })
  })

  test('keeps the manifest without builds as it is', async () => {
    const manifest = await generateManifest({ pkgDir: projectDir }, () => {})

    expect(
      Object.keys(manifest.nodeModules!).filter(file => file.includes('.vrowzer-cjs'))
    ).toEqual([])
    expect(readPackageJsonOf(manifest).exports).toEqual({
      '.': '../.vrowzer-esm/fixture_cjs.js',
      './feature': '../.vrowzer-esm/fixture_cjs_feature.js'
    })
  })
})
