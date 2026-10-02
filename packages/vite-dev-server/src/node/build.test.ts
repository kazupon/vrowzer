import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import colors from 'picocolors'
import type {
  LogLevel,
  OutputAsset,
  OutputChunk,
  OutputOptions,
  RolldownOptions,
  RolldownOutput,
  RollupLog,
} from 'rolldown'
import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test'

// NOTE(kazupon): vite-dev-server loads rolldown from the browser build (`@vrowzer/rolldown`).
// The unit tests run in Node, so they build with the Node build of the same rolldown version.
// Vitest gives the original module to the second of two concurrent dynamic imports of a mocked
// module, so the tests run the builds one after another.
vi.mock('@vrowzer/rolldown', () => import('rolldown'))
vi.mock('@vrowzer/rolldown/experimental', () => import('rolldown/experimental'))
vi.mock('@vrowzer/rolldown/parseAst', () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => import('rolldown/utils'))

import type {
  BuildEnvironmentOptions,
  LibraryFormats,
  LibraryOptions,
} from './build'
import {
  BuildEnvironment,
  ChunkMetadataMap,
  build,
  createBuilder,
  onRollupLog,
  resolveBuildOutputs,
  resolveLibFilename,
  resolveRolldownOptions,
} from './build'
import { resolveConfig } from './config'
import type { Logger } from './logger'
import { createLogger } from './logger'
import { injectQuery, normalizePath } from './utils'
import type { BuildProjectLog } from './builderUtils'
import {
  createBuildLogPlugin,
  createCollectingLogger,
  createUnsupportedFeaturesPlugin,
} from './builderUtils'

// Ported from upstream Vite (`packages/vite/src/node/__tests__/build.spec.ts`).
// NOTE(kazupon): not ported yet:
// - the SSR builds, `sharedConfigBuild`, `chunkImportMap`, the watch mode and the manifest

// NOTE(kazupon): the fixtures are in `__tests__`, as upstream has them next to its spec
const dirname = fileURLToPath(new URL('./__tests__', import.meta.url))

type FormatsToFileNames = [LibraryFormats, string][]

beforeAll(() => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('build', () => {
  test('file hash should change when css changes for dynamic entries', async () => {
    const buildProject = async (cssColor: string) => {
      return (await build({
        root: resolve(dirname, 'packages/build-project'),
        logLevel: 'silent',
        build: {
          write: false,
        },
        plugins: [
          {
            name: 'test',
            resolveId(id) {
              if (
                id === 'entry.js' ||
                id === 'subentry.js' ||
                id === 'foo.css'
              ) {
                return '\0' + id
              }
            },
            load(id) {
              if (id === '\0entry.js') {
                return `window.addEventListener('click', () => { import('subentry.js') });`
              }
              if (id === '\0subentry.js') {
                return `import 'foo.css'`
              }
              if (id === '\0foo.css') {
                return `.foo { color: ${cssColor} }`
              }
            },
          },
        ],
      })) as RolldownOutput
    }
    // NOTE(kazupon): one after another, as the note of the mocks says
    // const result = await Promise.all([
    //   buildProject('red'),
    //   buildProject('blue'),
    // ])
    const result = [await buildProject('red'), await buildProject('blue')]
    expect(getOutputHashChanges(result[0], result[1])).toMatchInlineSnapshot(`
      {
        "changed": [
          "index",
          "_subentry.css",
        ],
        "unchanged": [
          "undefined",
        ],
      }
    `)
    assertOutputHashContentChange(result[0], result[1])
  })

  test('file hash should change when renderBuiltUrl changes', async () => {
    const createRenderBuiltUrl = (base: string) => (filename: string) =>
      `${base}/${filename}`
    const renderBuiltUrlA = createRenderBuiltUrl('/cdn-a')
    const renderBuiltUrlB = createRenderBuiltUrl('/cdn-b')

    expect(renderBuiltUrlA.toString()).toBe(renderBuiltUrlB.toString())

    // NOTE(kazupon): one after another, as the note of the mocks says
    // const result = await Promise.all([
    //   buildProjectWithRenderBuiltUrl(renderBuiltUrlA),
    //   buildProjectWithRenderBuiltUrl(renderBuiltUrlB),
    // ])
    const result = [await buildProjectWithRenderBuiltUrl(renderBuiltUrlA), await buildProjectWithRenderBuiltUrl(renderBuiltUrlB)]

    expect(getOutputHashChanges(result[0], result[1])).toMatchInlineSnapshot(`
      {
        "changed": [
          "index",
        ],
        "unchanged": [
          "_subentry",
          "asset.txt",
          "undefined",
        ],
      }
    `)
    assertOutputHashContentChange(result[0], result[1])
  })

  test('renderBuiltUrl receives asset postfixes in JS and CSS', async () => {
    const result = await buildProjectWithRenderBuiltUrl(
      (filename) => injectQuery(filename, 'dpl=id'),
      true,
    )
    const entry = result.output.find(
      (output): output is OutputChunk =>
        output.type === 'chunk' && output.isEntry,
    )
    const css = result.output.find(
      (output): output is OutputAsset =>
        output.type === 'asset' && output.fileName.endsWith('.css'),
    )

    expect(entry?.code).toContain('?dpl=id&marker=value')
    expect(entry?.code).toContain('?dpl=id&marker=other')
    expect(css?.source.toString()).toContain('?dpl=id&marker=value')
    expect(css?.source.toString()).toContain('?dpl=id&marker=other')
  })

  test('top-level input is used as the default build entry', async () => {
    const result = (await build({
      root: resolve(dirname, 'packages/build-project'),
      logLevel: 'silent',
      input: 'top-level-entry.js',
      build: {
        write: false,
      },
      plugins: [
        {
          name: 'test',
          resolveId(id) {
            if (id.replace(/\\/g, '/').endsWith('top-level-entry.js')) {
              return '\0top-level-entry.js'
            }
          },
          load(id) {
            if (id === '\0top-level-entry.js') {
              return `console.log('from-top-level-input')`
            }
          },
        },
      ],
    })) as RolldownOutput
    const chunk = result.output.find((o) => o.type === 'chunk')
    expect(chunk?.fileName).toContain('top-level-entry')
    expect(chunk?.code).toContain('from-top-level-input')
  })

  test('top-level input can be a virtual module for build', async () => {
    const input = 'virtual:entry'
    const resolvedInput = `\0${input}`
    const result = (await build({
      root: resolve(dirname, 'packages/build-project'),
      logLevel: 'silent',
      input,
      build: {
        write: false,
      },
      plugins: [
        {
          name: 'virtual-entry',
          resolveId(id) {
            if (id === input) {
              return resolvedInput
            }
          },
          load(id) {
            if (id === resolvedInput) {
              return `console.log('from-virtual-top-level-input')`
            }
          },
        },
      ],
    })) as RolldownOutput
    const chunk = result.output.find((o) => o.type === 'chunk')
    expect(chunk?.code).toContain('from-virtual-top-level-input')
  })

  test('file hash should change when pure css chunk changes', async () => {
    const buildProject = async (cssColor: string) => {
      return (await build({
        root: resolve(dirname, 'packages/build-project'),
        logLevel: 'silent',
        build: {
          write: false,
        },
        plugins: [
          {
            name: 'test',
            resolveId(id) {
              if (
                id === 'entry.js' ||
                id === 'foo.js' ||
                id === 'bar.js' ||
                id === 'baz.js' ||
                id === 'foo.css' ||
                id === 'bar.css' ||
                id === 'baz.css'
              ) {
                return '\0' + id
              }
            },
            load(id) {
              if (id === '\0entry.js') {
                return `
                  window.addEventListener('click', () => { import('foo.js') });
                  window.addEventListener('click', () => { import('bar.js') });`
              }
              if (id === '\0foo.js') {return `import 'foo.css'; import 'baz.js'`}
              if (id === '\0bar.js') {return `import 'bar.css'; import 'baz.js'`}
              if (id === '\0baz.js') {return `import 'baz.css'`}
              if (id === '\0foo.css') {return `.foo { color: red }`}
              if (id === '\0bar.css') {return `.foo { color: green }`}
              if (id === '\0baz.css') {return `.foo { color: ${cssColor} }`}
            },
          },
        ],
      })) as RolldownOutput
    }
    // NOTE(kazupon): one after another, as the note of the mocks says
    // const result = await Promise.all([
    //   buildProject('yellow'),
    //   buildProject('blue'),
    // ])
    const result = [await buildProject('yellow'), await buildProject('blue')]
    expect(getOutputHashChanges(result[0], result[1])).toMatchInlineSnapshot(`
      {
        "changed": [
          "index",
          "_bar",
          "_foo",
          "_baz.css",
        ],
        "unchanged": [
          "_bar.css",
          "_foo.css",
          "undefined",
        ],
      }
    `)
    assertOutputHashContentChange(result[0], result[1])
  })

  test.for([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
    ['auto', true],
    ['auto', false],
  ] as const)(
    'large json object files should have tree-shaking (json.stringify: %s, json.namedExports: %s)',
    async ([stringify, namedExports]) => {
      const esBundle = (await build({
        mode: 'development',
        root: resolve(dirname, 'packages/build-project'),
        logLevel: 'silent',
        json: { stringify, namedExports },
        build: {
          minify: false,
          modulePreload: { polyfill: false },
          write: false,
        },
        plugins: [
          {
            name: 'test',
            resolveId(id) {
              if (
                id === 'entry.js' ||
                id === 'object.json' ||
                id === 'array.json'
              ) {
                return '\0' + id
              }
            },
            load(id) {
              if (id === '\0entry.js') {
                return `
                  import object from 'object.json';
                  import array from 'array.json';
                  console.log();
                `
              }
              if (id === '\0object.json') {
                return `
                  {"value": {"${stringify}_${namedExports}":"JSON_OBJ${'_'.repeat(10_000)}"}}
                `
              }
              if (id === '\0array.json') {
                return `
                  ["${stringify}_${namedExports}","JSON_ARR${'_'.repeat(10_000)}"]
                `
              }
            },
          },
        ],
      })) as RolldownOutput

      const foo = esBundle.output.find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry,
      ) as OutputChunk
      expect(foo.code).not.contains('JSON_ARR')
      expect(foo.code).not.contains('JSON_OBJ')
    },
  )

  test('external modules should not be hoisted in library build', async () => {
    const [esBundle] = (await build({
      logLevel: 'silent',
      build: {
        lib: {
          entry: ['foo.js', 'bar.js'],
          formats: ['es'],
        },
        rolldownOptions: {
          external: 'external',
        },
        write: false,
      },
      plugins: [
        {
          name: 'test',
          resolveId(id) {
            const name = basename(id)
            if (name === 'foo.js' || name === 'bar.js') {
              return name
            }
          },
          load(id) {
            if (id === 'foo.js') {
              return `
                  import bar from 'bar.js'
                  export default bar()
                `
            }
            if (id === 'bar.js') {
              return `
                  import ext from 'external';
                  export default ext();`
            }
          },
        },
      ],
    })) as RolldownOutput[]

    // NOTE(kazupon): the default root is `/` (the virtual file system of the Worker), which has no
    // package.json here, so the es output gets `.mjs` instead of upstream's `.js`
    const foo = esBundle.output.find(
      (chunk) => chunk.fileName === 'foo.mjs',
      // (chunk) => chunk.fileName === 'foo.js',
    ) as OutputChunk
    expect(foo.code).not.contains('import "external"')
  })
})

const baseLibOptions: LibraryOptions = {
  fileName: 'my-lib',
  entry: 'mylib.js',
}

describe('resolveBuildOutputs', () => {
  test('resolves outputs correctly', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = { ...baseLibOptions }
    const outputs: OutputOptions[] = [{ format: 'es' }]
    const resolvedOutputs = resolveBuildOutputs(outputs, libOptions, logger)

    expect(resolvedOutputs).toEqual([
      {
        format: 'es',
      },
    ])
  })

  test('resolves outputs from lib options', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = { ...baseLibOptions, name: 'lib' }
    const resolvedOutputs = resolveBuildOutputs(void 0, libOptions, logger)

    expect(resolvedOutputs).toEqual([
      {
        format: 'es',
      },
      {
        format: 'umd',
      },
    ])
  })

  test('does not change outputs when lib options are missing', () => {
    const logger = createLogger()
    const outputs: OutputOptions[] = [{ format: 'es' }]
    const resolvedOutputs = resolveBuildOutputs(outputs, false, logger)

    expect(resolvedOutputs).toEqual(outputs)
  })

  test('logs a warning when outputs is an array and formats are specified', () => {
    const logger = createLogger()
    const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const libOptions: LibraryOptions = {
      ...baseLibOptions,
      formats: ['iife'],
    }
    const outputs: OutputOptions[] = [{ format: 'es' }]

    resolveBuildOutputs(outputs, libOptions, logger)

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"build.lib.formats" will be ignored because'),
    )
  })

  test('throws an error when lib.name is missing on iife format', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = {
      ...baseLibOptions,
      formats: ['iife'],
    }
    const resolveBuild = () => resolveBuildOutputs(void 0, libOptions, logger)

    expect(resolveBuild).toThrowError(/Option "build\.lib\.name" is required/)
  })

  test('throws an error when lib.name is missing on umd format', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = { ...baseLibOptions, formats: ['umd'] }
    const resolveBuild = () => resolveBuildOutputs(void 0, libOptions, logger)

    expect(resolveBuild).toThrowError(/Option "build\.lib\.name" is required/)
  })

  test('throws an error when output.name is missing on iife format', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = { ...baseLibOptions }
    const outputs: OutputOptions[] = [{ format: 'iife' }]
    const resolveBuild = () => resolveBuildOutputs(outputs, libOptions, logger)

    expect(resolveBuild).toThrowError(
      /Entries in "build\.rolldownOptions\.output" must specify "name"/,
    )
  })

  test('throws an error when output.name is missing on umd format', () => {
    const logger = createLogger()
    const libOptions: LibraryOptions = { ...baseLibOptions }
    const outputs: OutputOptions[] = [{ format: 'umd' }]
    const resolveBuild = () => resolveBuildOutputs(outputs, libOptions, logger)

    expect(resolveBuild).toThrowError(
      /Entries in "build\.rolldownOptions\.output" must specify "name"/,
    )
  })

  describe('input resolution in resolveRolldownOptions', () => {
    const buildProjectRoot = resolve(dirname, 'packages/build-project')

    test('build.rolldownOptions.input takes precedence over top-level input', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        input: 'top-level-entry.js',
        build: {
          rolldownOptions: { input: 'explicit-entry.js' },
        },
      })
      const options = resolveRolldownOptions(
        builder.environments.client,
        new ChunkMetadataMap(),
      )
      expect(options.input).toBe('explicit-entry.js')
    })

    test('top-level tsconfig applies to Rolldown options', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        tsconfig: './custom.tsconfig.json',
        build: {
          rolldownOptions: {
            tsconfig: './other.tsconfig.json',
            resolve: { tsconfigFilename: './legacy.tsconfig.json' },
          },
        },
      })
      const options = resolveRolldownOptions(
        builder.environments.client,
        new ChunkMetadataMap(),
      )
      expect(options.tsconfig).toBe(
        normalizePath(resolve(buildProjectRoot, 'custom.tsconfig.json')),
      )
      expect(options.resolve?.tsconfigFilename).toBeUndefined()
    })

    test('falls back to index.html when no input is set', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
      })
      const options = resolveRolldownOptions(
        builder.environments.client,
        new ChunkMetadataMap(),
      )
      expect(options.input).toBe(resolve(buildProjectRoot, 'index.html'))
    })

    test('build.ssr string entry takes precedence over input', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        environments: {
          ssr: {
            input: 'env-input.js',
            build: { ssr: 'ssr-entry.js' },
          },
        },
      })
      const options = resolveRolldownOptions(
        builder.environments.ssr,
        new ChunkMetadataMap(),
      )
      expect(options.input).toBe(resolve(buildProjectRoot, 'ssr-entry.js'))
    })

    test('throws when build.lib is set without entry or top-level input', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        build: {
          lib: { name: 'MyLib', formats: ['es'] },
        },
      })
      expect(() =>
        resolveRolldownOptions(
          builder.environments.client,
          new ChunkMetadataMap(),
        ),
      ).toThrow(
        /Either "build\.lib\.entry" or the top-level "input" option is required/,
      )
    })
  })

  describe('output minify and comments resolution in resolveRolldownOptions', () => {
    const buildProjectRoot = resolve(dirname, 'packages/build-project')

    test('merges a partial output.minify object with the lib defaults', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        build: {
          minify: 'oxc',
          lib: { ...baseLibOptions, formats: ['es'] },
          rolldownOptions: {
            output: {
              minify: { mangle: { keepNames: true } },
            },
          },
        },
      })
      const options = resolveRolldownOptions(
        builder.environments.client,
        new ChunkMetadataMap(),
      )
      const outputs = options.output!
      const output = Array.isArray(outputs) ? outputs[0] : outputs
      expect(output.minify).toStrictEqual({
        compress: true,
        mangle: { keepNames: true },
        codegen: false,
      })
    })

    test('keeps an explicit boolean output.minify untouched', async () => {
      const builder = await createBuilder({
        root: buildProjectRoot,
        logLevel: 'silent',
        build: {
          minify: 'oxc',
          lib: { ...baseLibOptions, formats: ['es'] },
          rolldownOptions: {
            output: {
              minify: false,
            },
          },
        },
      })
      const options = resolveRolldownOptions(
        builder.environments.client,
        new ChunkMetadataMap(),
      )
      const outputs = options.output!
      const output = Array.isArray(outputs) ? outputs[0] : outputs
      expect(output.minify).toBe(false)
    })
  })
})

describe('resolveLibFilename', () => {
  test('custom filename function', () => {
    const filename = resolveLibFilename(
      {
        fileName: (format) => `custom-filename-function.${format}.js`,
        entry: 'mylib.js',
      },
      'es',
      'myLib',
      resolve(dirname, 'packages/name'),
    )

    expect(filename).toBe('custom-filename-function.es.js')
  })

  test('custom filename string', () => {
    const filename = resolveLibFilename(
      {
        fileName: 'custom-filename',
        entry: 'mylib.js',
      },
      'es',
      'myLib',
      resolve(dirname, 'packages/name'),
    )

    expect(filename).toBe('custom-filename.mjs')
  })

  test('package name as filename', () => {
    const filename = resolveLibFilename(
      {
        entry: 'mylib.js',
      },
      'es',
      'myLib',
      resolve(dirname, 'packages/name'),
    )

    expect(filename).toBe('mylib.mjs')
  })

  test('custom filename and no package name', () => {
    const filename = resolveLibFilename(
      {
        fileName: 'custom-filename',
        entry: 'mylib.js',
      },
      'es',
      'myLib',
      resolve(dirname, 'packages/noname'),
    )

    expect(filename).toBe('custom-filename.mjs')
  })

  test('missing filename', () => {
    const filename = resolveLibFilename(
      {
        entry: 'mylib.js',
      },
      'es',
      'myLib',
      resolve(dirname, 'packages/noname'),
    )
    expect(filename).toBe('named-testing-package.mjs')
  })

  test('commonjs package extensions', () => {
    const formatsToFilenames: FormatsToFileNames = [
      ['es', 'my-lib.mjs'],
      ['umd', 'my-lib.umd.js'],
      ['cjs', 'my-lib.js'],
      ['iife', 'my-lib.iife.js'],
    ]

    for (const [format, expectedFilename] of formatsToFilenames) {
      const filename = resolveLibFilename(
        baseLibOptions,
        format,
        'myLib',
        resolve(dirname, 'packages/noname'),
      )

      expect(filename).toBe(expectedFilename)
    }
  })

  test('module package extensions', () => {
    const formatsToFilenames: FormatsToFileNames = [
      ['es', 'my-lib.js'],
      ['umd', 'my-lib.umd.cjs'],
      ['cjs', 'my-lib.cjs'],
      ['iife', 'my-lib.iife.js'],
    ]

    for (const [format, expectedFilename] of formatsToFilenames) {
      const filename = resolveLibFilename(
        baseLibOptions,
        format,
        'myLib',
        resolve(dirname, 'packages/module'),
      )

      expect(expectedFilename).toBe(filename)
    }
  })

  test('multiple entries with aliases', () => {
    const libOptions: LibraryOptions = {
      entry: {
        entryA: 'entryA.js',
        entryB: 'entryB.js',
      },
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('entryA.mjs')
    expect(fileName2).toBe('entryB.mjs')
  })

  test('multiple entries with aliases: custom filename function', () => {
    const libOptions: LibraryOptions = {
      entry: {
        entryA: 'entryA.js',
        entryB: 'entryB.js',
      },
      fileName: (format, entryAlias) =>
        `custom-filename-function.${entryAlias}.${format}.js`,
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('custom-filename-function.entryA.es.js')
    expect(fileName2).toBe('custom-filename-function.entryB.es.js')
  })

  test('multiple entries with aliases: custom filename string', () => {
    const libOptions: LibraryOptions = {
      entry: {
        entryA: 'entryA.js',
        entryB: 'entryB.js',
      },
      fileName: 'custom-filename',
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('custom-filename.mjs')
    expect(fileName2).toBe('custom-filename.mjs')
  })

  test('multiple entries as array', () => {
    const libOptions: LibraryOptions = {
      entry: ['entryA.js', 'entryB.js'],
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('entryA.mjs')
    expect(fileName2).toBe('entryB.mjs')
  })

  test('multiple entries as array: custom filename function', () => {
    const libOptions: LibraryOptions = {
      entry: ['entryA.js', 'entryB.js'],
      fileName: (format, entryAlias) =>
        `custom-filename-function.${entryAlias}.${format}.js`,
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('custom-filename-function.entryA.es.js')
    expect(fileName2).toBe('custom-filename-function.entryB.es.js')
  })

  test('multiple entries as array: custom filename string', () => {
    const libOptions: LibraryOptions = {
      entry: ['entryA.js', 'entryB.js'],
      fileName: 'custom-filename',
    }

    const [fileName1, fileName2] = ['entryA', 'entryB'].map((entryAlias) =>
      resolveLibFilename(
        libOptions,
        'es',
        entryAlias,
        resolve(dirname, 'packages/name'),
      ),
    )

    expect(fileName1).toBe('custom-filename.mjs')
    expect(fileName2).toBe('custom-filename.mjs')
  })
})

describe('resolveBuildOutputs', () => {
  test('default format: one entry', () => {
    const libOptions: LibraryOptions = {
      entry: 'entryA.js',
      name: 'entryA',
    }

    expect(resolveBuildOutputs(undefined, libOptions, {} as Logger)).toEqual([
      { format: 'es' },
      { format: 'umd' },
    ])
    expect(
      resolveBuildOutputs({ name: 'A' }, libOptions, {} as Logger),
    ).toEqual([
      { format: 'es', name: 'A' },
      { format: 'umd', name: 'A' },
    ])
    expect(
      resolveBuildOutputs([{ name: 'A' }], libOptions, {} as Logger),
    ).toEqual([{ name: 'A' }])
  })

  test('default format: multiple entries', () => {
    const libOptions: LibraryOptions = {
      entry: ['entryA.js', 'entryB.js'],
    }

    expect(resolveBuildOutputs(undefined, libOptions, {} as Logger)).toEqual([
      { format: 'es' },
      { format: 'cjs' },
    ])
    expect(
      resolveBuildOutputs({ name: 'A' }, libOptions, {} as Logger),
    ).toEqual([
      { format: 'es', name: 'A' },
      { format: 'cjs', name: 'A' },
    ])
    expect(
      resolveBuildOutputs([{ name: 'A' }], libOptions, {} as Logger),
    ).toEqual([{ name: 'A' }])
  })

  test('umd or iife: should not support multiple entries', () => {
    ;['umd', 'iife'].forEach((format) => {
      expect(() =>
        resolveBuildOutputs(
          undefined,
          {
            entry: ['entryA.js', 'entryB.js'],
            formats: [format as LibraryFormats],
          },
          {} as Logger,
        ),
      ).toThrow(
        `Multiple entry points are not supported when output formats include "umd" or "iife".`,
      )
    })
  })

  test('umd or iife: should define build.lib.name', () => {
    ;['umd', 'iife'].forEach((format) => {
      expect(() =>
        resolveBuildOutputs(
          undefined,
          {
            entry: 'entryA.js',
            formats: [format as LibraryFormats],
          },
          {} as Logger,
        ),
      ).toThrow(
        `Option "build.lib.name" is required when output formats include "umd" or "iife".`,
      )
    })
  })

  test('array outputs: should ignore build.lib.formats', () => {
    const log = { warn: vi.fn() } as unknown as Logger
    expect(
      resolveBuildOutputs(
        [{ name: 'A' }],
        {
          entry: 'entryA.js',
          formats: ['es'],
        },
        log,
      ),
    ).toEqual([{ name: 'A' }])
    expect(log.warn).toHaveBeenLastCalledWith(
      colors.yellow(
        `"build.lib.formats" will be ignored because "build.rolldownOptions.output" is already an array format.`,
      ),
    )
  })

  // NOTE(kazupon): not ported yet: `ssrEmitAssets`, `emitAssets`, `ssr builtin` and `ssr custom` (SSR builds)
})

test('resolving lib entry from the top-level input does not mutate the user config', async () => {
  const userLib: LibraryOptions = { formats: ['es'] }
  const config = await resolveConfig(
    {
      configFile: false,
      input: 'src/main.ts',
      build: { lib: userLib },
    },
    'build',
  )
  const resolvedLib = config.environments.client.build.lib
  assert(resolvedLib !== false)
  expect(resolvedLib.entry).toBe('src/main.ts')
  expect(userLib.entry).toBeUndefined()
})

describe('onRollupLog', () => {
  const pluginName = 'rollup-plugin-test'
  const msgInfo = 'This is the INFO message.'
  const msgWarn = 'This is the WARN message.'
  const buildProject = async (
    level: LogLevel | 'error',
    message: string | RollupLog,
    logger: Logger,
    options?: Pick<RolldownOptions, 'onLog' | 'onwarn'>,
  ) => {
    await build({
      root: resolve(dirname, 'packages/build-project'),
      logLevel: 'info',
      build: {
        write: false,
        rolldownOptions: {
          ...options,
          logLevel: 'debug',
        },
      },
      customLogger: logger,
      plugins: [
        {
          name: pluginName,
          resolveId(id) {
            this[level](message)
            if (id === 'entry.js') {
              return '\0' + id
            }
          },
          load(id) {
            if (id === '\0entry.js') {
              return `export default "This is test module";`
            }
          },
        },
      ],
    })
  }

  const callOnRollupLog = async (
    logger: Logger,
    level: LogLevel,
    log: RollupLog,
  ) => {
    const config = await resolveConfig(
      { customLogger: logger },
      'build',
      'production',
      'production',
    )
    const buildEnvironment = new BuildEnvironment('client', config)
    onRollupLog(level, log, buildEnvironment)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Rollup logs of info should be handled by vite', async () => {
    const logger = createLogger()
    const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})

    await buildProject('info', msgInfo, logger)
    const logs = loggerSpy.mock.calls.map((args) =>
      stripVTControlCharacters(args[0]),
    )
    expect(logs).contain(`[plugin ${pluginName}] ${msgInfo}`)
  })

  test('Rollup logs of warn should be handled by vite', async () => {
    const logger = createLogger('silent')
    const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    await buildProject('warn', msgWarn, logger)
    const logs = loggerSpy.mock.calls.map((args) =>
      stripVTControlCharacters(args[0]),
    )
    expect(logs).contain(`[plugin ${pluginName}] ${msgWarn}`)
  })

  test('onLog passed by user is called', async () => {
    const logger = createLogger('silent')

    const onLogInfo = vi.fn((_log: RollupLog) => {})
    await buildProject('info', msgInfo, logger, {
      onLog(level, log) {
        if (level === 'info') {
          onLogInfo(log)
        }
      },
    })
    expect(onLogInfo).toBeCalledWith(
      expect.objectContaining({ message: msgInfo, plugin: pluginName }),
    )
  })

  test('onwarn passed by user is called', async () => {
    const logger = createLogger('silent')

    const onWarn = vi.fn((_log: RollupLog) => {})
    await buildProject('warn', msgWarn, logger, {
      onwarn(warning) {
        onWarn(warning)
      },
    })
    expect(onWarn).toBeCalledWith(
      expect.objectContaining({ message: msgWarn, plugin: pluginName }),
    )
  })

  test('should throw error when warning contains UNRESOLVED_IMPORT', async () => {
    const logger = createLogger()
    await expect(() =>
      callOnRollupLog(logger, 'warn', {
        code: 'UNRESOLVED_IMPORT',
        message: 'test',
      }),
    ).rejects.toThrowError(/Rolldown failed to resolve import/)
  })

  test.each([[`Unsupported expression`], [`statically analyzed`]])(
    'should ignore dynamic import warnings (%s)',
    async (message: string) => {
      const logger = createLogger()
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      await callOnRollupLog(logger, 'warn', {
        code: 'PLUGIN_WARNING',
        message: message,
        plugin: 'rollup-plugin-dynamic-import-variables',
      })
      expect(loggerSpy).toBeCalledTimes(0)
    },
  )

  test.each([[`CIRCULAR_DEPENDENCY`], [`THIS_IS_UNDEFINED`]])(
    'should ignore some warnings (%s)',
    async (code: string) => {
      const logger = createLogger()
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      await callOnRollupLog(logger, 'warn', {
        code: code,
        message: 'test message',
        plugin: pluginName,
      })
      expect(loggerSpy).toBeCalledTimes(0)
    },
  )
})

// vrowzer: builds resolve packages with the native resolve plugin (`viteResolvePlugin`), as upstream does
test('copies public directory after building same environment with write false first', async (ctx) => {
  const root = resolve(dirname, 'fixtures/public-dir-write-false')
  ctx.onTestFinished(() =>
    fsp.rm(resolve(root, 'dist'), { recursive: true, force: true }),
  )

  const builder = await createBuilder({
    root,
    configFile: false,
    logLevel: 'silent',
  })

  builder.environments.client.config.build.write = false
  await builder.build(builder.environments.client)

  builder.environments.client.config.build.write = true
  await builder.build(builder.environments.client)

  await expect(
    fsp.readFile(resolve(root, 'dist/favicon.svg'), 'utf-8'),
  ).resolves.toBe('<svg></svg>')
})

describe('package resolution in library builds', () => {
  let root: string

  function writeFiles(files: Record<string, string>) {
    for (const [file, content] of Object.entries(files)) {
      const filePath = join(root, file)
      fs.mkdirSync(resolve(filePath, '..'), { recursive: true })
      fs.writeFileSync(filePath, content)
    }
  }

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('picks the browser entries of the packages', async () => {
    root = fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-resolve-'))
    writeFiles({
      'entry.js': [
        `import { value as fromExports } from 'pkg-exports'`,
        `import { value as fromBrowser } from 'pkg-browser'`,
        `import { value as fromModule } from 'pkg-module'`,
        `export const values = [fromExports, fromBrowser, fromModule]`,
      ].join('\n'),
      'node_modules/pkg-exports/package.json': JSON.stringify({
        name: 'pkg-exports',
        exports: {
          '.': {
            browser: './browser.js',
            node: './node.js',
            default: './default.js',
          },
        },
      }),
      'node_modules/pkg-exports/browser.js': `export const value = 'exports-browser'`,
      'node_modules/pkg-exports/node.js': `export const value = 'exports-node'`,
      'node_modules/pkg-exports/default.js': `export const value = 'exports-default'`,
      'node_modules/pkg-browser/package.json': JSON.stringify({
        name: 'pkg-browser',
        main: './main.js',
        browser: './browser.js',
      }),
      'node_modules/pkg-browser/main.js': `export const value = 'browser-main'`,
      'node_modules/pkg-browser/browser.js': `export const value = 'browser-field'`,
      'node_modules/pkg-module/package.json': JSON.stringify({
        name: 'pkg-module',
        main: './main.cjs',
        module: './module.js',
      }),
      'node_modules/pkg-module/main.cjs': `exports.value = 'module-main'`,
      'node_modules/pkg-module/module.js': `export const value = 'module-field'`,
    })

    const [output] = (await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: { entry: 'entry.js', formats: ['es'], fileName: 'lib' },
      },
    })) as RolldownOutput[]

    const chunk = output.output.find(
      (o) => o.type === 'chunk' && o.isEntry,
    ) as OutputChunk
    expect(chunk.code).toContain('exports-browser')
    expect(chunk.code).toContain('browser-field')
    expect(chunk.code).toContain('module-field')
    expect(chunk.code).not.toMatch(/exports-node|exports-default|browser-main|module-main/)
  })
})

describe('warnings of the builder', () => {
  let root: string

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('keep the code, the module and the location of the warnings of rolldown', async () => {
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-warnings-')))
    fs.writeFileSync(join(root, 'main.js'), `export const value = eval('1')\n`)
    const warnings: BuildProjectLog[] = []

    // The same logger and plugin as the builder
    await build({
      root,
      logLevel: 'warn',
      customLogger: createCollectingLogger(warnings),
      plugins: [createBuildLogPlugin(warnings)],
      build: {
        write: false,
        minify: false,
        lib: { entry: 'main.js', formats: ['es'], fileName: 'lib' },
      },
    })

    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'EVAL',
        id: join(root, 'main.js'),
        loc: expect.objectContaining({ line: 1 }),
        message: expect.stringContaining('eval'),
      }),
    ])
  })

  test('report what builds do not support yet, where it is', async () => {
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-warnings-')))
    const files: Record<string, string> = {
      'index.html': `<script type="module" src="./main.js"></script>`,
      'main.js': [
        `const modules = import.meta.glob('./pages/*.js')`,
        'const lang = navigator.language',
        'const messages = import(`./locales/${lang}.js`)',
        `const worker = new Worker(new URL('./worker.js', import.meta.url))`,
        `console.log(modules, messages, worker)`,
      ].join('\n'),
      'worker.js': `self.postMessage('ready')`,
    }
    for (const [file, content] of Object.entries(files)) {
      fs.writeFileSync(join(root, file), content)
    }
    const warnings: BuildProjectLog[] = []

    await build({
      root,
      logLevel: 'warn',
      customLogger: createCollectingLogger(warnings),
      plugins: [createBuildLogPlugin(warnings), createUnsupportedFeaturesPlugin()],
      build: { write: false, minify: false, assetsInlineLimit: 0 },
    })

    const warningAt = (line: number, message: string) =>
      expect.objectContaining({
        plugin: 'vrowzer:unsupported-features',
        id: join(root, 'main.js'),
        loc: expect.objectContaining({ line }),
        message: expect.stringContaining(message),
      })
    expect(warnings).toEqual([
      warningAt(1, 'import.meta.glob()'),
      warningAt(4, 'new Worker'),
      warningAt(3, 'Dynamic imports with variables'),
    ])
  })

  test('fail with a clear error on the ?worker imports', async () => {
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-warnings-')))
    fs.writeFileSync(join(root, 'index.html'), `<script type="module" src="./main.js"></script>`)
    fs.writeFileSync(join(root, 'main.js'), `import MyWorker from './worker.js?worker'\nnew MyWorker()`)
    fs.writeFileSync(join(root, 'worker.js'), `self.postMessage('ready')`)

    await expect(
      build({
        root,
        logLevel: 'silent',
        plugins: [createUnsupportedFeaturesPlugin()],
        build: { write: false },
      }),
    ).rejects.toThrow('The Workers of the project ("./worker.js?worker") are not supported in builds yet.')
  })
})

describe('CommonJS dependencies in builds', () => {
  let root: string
  let nodeEnv: string | undefined

  beforeEach(() => {
    // A build sets NODE_ENV to production when it is not set yet
    nodeEnv = process.env.NODE_ENV
    delete process.env.NODE_ENV
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-cjs-')))
    // The layout of a manifest of `@vrowzer/vite-plugin` with the build option: the previews take
    // the ES module bundled for development, and builds the original CommonJS files
    const files: Record<string, string> = {
      'index.html': `<script type="module" src="./main.js"></script>`,
      'main.js': `import fixture from 'cjs-fixture'\nconsole.log(fixture.mode)`,
      'node_modules/cjs-fixture/package.json': JSON.stringify({
        name: 'cjs-fixture',
        type: 'module',
        exports: {
          '.': {
            development: '../.vrowzer-esm/cjs-fixture.js',
            default: './.vrowzer-cjs/index.js',
          },
        },
      }),
      'node_modules/cjs-fixture/.vrowzer-cjs/package.json': JSON.stringify({
        name: 'cjs-fixture',
        exports: { '.': './index.js' },
      }),
      'node_modules/cjs-fixture/.vrowzer-cjs/index.js': [
        `if (process.env.NODE_ENV === 'production') {`,
        `  module.exports = require('./production.js')`,
        `} else {`,
        `  module.exports = require('./development.js')`,
        `}`,
      ].join('\n'),
      'node_modules/cjs-fixture/.vrowzer-cjs/production.js': `exports.mode = 'cjs-production'`,
      'node_modules/cjs-fixture/.vrowzer-cjs/development.js': `exports.mode = 'cjs-development'`,
      'node_modules/.vrowzer-esm/cjs-fixture.js': `export default { mode: 'esm-development' }`,
    }
    for (const [file, content] of Object.entries(files)) {
      const filePath = join(root, file)
      fs.mkdirSync(resolve(filePath, '..'), { recursive: true })
      fs.writeFileSync(filePath, content)
    }
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
    if (nodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = nodeEnv
    }
  })

  test('bundles the production branch of the original files', async () => {
    const { output } = (await build({
      root,
      logLevel: 'silent',
      build: { write: false, minify: false },
    })) as RolldownOutput

    const code = output
      .filter((o): o is OutputChunk => o.type === 'chunk')
      .map((chunk) => chunk.code)
      .join('\n')
    expect(code).toContain('cjs-production')
    expect(code).not.toContain('cjs-development')
    expect(code).not.toContain('esm-development')
  })
})

describe('tsconfig in builds', () => {
  let root: string

  beforeAll(() => {
    // NOTE(kazupon): the temporary directory of macOS is behind a symbolic link (`/var` to
    // `/private/var`). Resolve it, so that the modules are inside the root.
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-tsconfig-')))
    const files: Record<string, string> = {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          jsx: 'react',
          jsxFactory: 'h',
          experimentalDecorators: true,
          baseUrl: '.',
          paths: { '@lib/*': ['src/lib/*'] },
        },
      }),
      'tsconfig.app.json': JSON.stringify({
        extends: './tsconfig.json',
        compilerOptions: { jsxFactory: 'createElement' },
      }),
      'src/main.tsx': [
        `import { value } from '@lib/value'`,
        `declare function h(...args: unknown[]): unknown`,
        `declare function createElement(...args: unknown[]): unknown`,
        `export const element = <div>{value}</div>`,
        `function decorator<T>(target: T): T { return target }`,
        `@decorator`,
        `export class Decorated {}`,
      ].join('\n'),
      'src/lib/value.ts': `export const value = 'from-paths'`,
    }
    for (const [file, content] of Object.entries(files)) {
      const filePath = join(root, file)
      fs.mkdirSync(resolve(filePath, '..'), { recursive: true })
      fs.writeFileSync(filePath, content)
    }
  })

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const buildEntry = async (tsconfig?: string) => {
    const [output] = (await build({
      root,
      logLevel: 'silent',
      tsconfig,
      resolve: { tsconfigPaths: true },
      build: {
        write: false,
        minify: false,
        lib: { entry: 'src/main.tsx', formats: ['es'], fileName: 'lib' },
      },
    })) as RolldownOutput[]
    return (output.output.find((o) => o.type === 'chunk') as OutputChunk).code
  }

  test('applies the tsconfig.json of the project', async () => {
    const code = await buildEntry()

    expect(code).toMatch(/\bh\("div"/)
    expect(code).toContain('__decorate(')
    expect(code).toContain('from-paths')
  })

  test('applies the file of the tsconfig option, with what it extends', async () => {
    const code = await buildEntry('./tsconfig.app.json')

    expect(code).toMatch(/\bcreateElement\("div"/)
    expect(code).not.toMatch(/\bh\("div"/)
    expect(code).toContain('__decorate(')
    expect(code).toContain('from-paths')
  })
})

describe('new URL(..., import.meta.url) in builds', () => {
  let root: string

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('emits the files that the URLs point to', async () => {
    // NOTE(kazupon): the temporary directory of macOS is behind a symbolic link (`/var` to
    // `/private/var`). Resolve it, so that the HTML entry is inside the root.
    root = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'vrowzer-build-url-')))
    const image = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])
    const files: Record<string, string | Uint8Array> = {
      'index.html': `<script type="module" src="./main.js"></script>`,
      'main.js': [
        `export const image = new URL('./image.png', import.meta.url).href`,
        `export const publicFile = new URL('/robots.txt', import.meta.url).href`,
        `export const missing = new URL('./missing.png', import.meta.url).href`,
      ].join('\n'),
      'image.png': image,
      'public/robots.txt': 'User-agent: *',
    }
    for (const [file, content] of Object.entries(files)) {
      const filePath = join(root, file)
      fs.mkdirSync(resolve(filePath, '..'), { recursive: true })
      fs.writeFileSync(filePath, content)
    }

    const { output } = (await build({
      root,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        assetsInlineLimit: 0,
      },
    })) as RolldownOutput

    const entry = output.find(
      (o): o is OutputChunk => o.type === 'chunk' && o.isEntry,
    )!
    const asset = output.find(
      (o): o is OutputAsset => o.type === 'asset' && o.fileName.endsWith('.png'),
    )!
    expect(asset.fileName).toMatch(/^assets\/image-[\w-]+\.png$/)
    expect([...(asset.source as Uint8Array)]).toEqual([...image])
    expect(entry.code).toContain(
      `new URL("/${asset.fileName}", "" + import.meta.url)`,
    )
    expect(entry.code).toContain(`new URL("/robots.txt", "" + import.meta.url)`)
    // a file that does not exist is left for the runtime
    expect(entry.code).toContain(`new URL("./missing.png", "" + import.meta.url)`)
  })
})

describe('HTML entries', () => {
  const buildHtmlProject = async (
    modulePreload?: BuildEnvironmentOptions['modulePreload'],
  ) =>
    (await build({
      root: resolve(dirname, 'packages/build-project'),
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        modulePreload,
      },
      plugins: [
        {
          name: 'test',
          resolveId(id) {
            if (id === 'entry.js' || id === 'style.css') {
              return '\0' + id
            }
          },
          load(id) {
            if (id === '\0entry.js') {
              return `import 'style.css'\nconsole.log('from-html-entry')`
            }
            if (id === '\0style.css') {
              return `h1 { color: red }`
            }
          },
        },
      ],
    })) as RolldownOutput

  const findOutputs = (output: RolldownOutput['output']) => ({
    html: output.find(
      (o): o is OutputAsset => o.type === 'asset' && o.fileName === 'index.html',
    ),
    entry: output.find(
      (o): o is OutputChunk => o.type === 'chunk' && o.isEntry,
    ),
    css: output.find(
      (o): o is OutputAsset => o.type === 'asset' && o.fileName.endsWith('.css'),
    ),
  })

  test('rewrites the scripts and the styles of the HTML, and injects the module preload polyfill', async () => {
    const { html, entry, css } = findOutputs((await buildHtmlProject()).output)

    expect(html?.source).toContain(
      `<script type="module" crossorigin src="/${entry?.fileName}"></script>`,
    )
    expect(html?.source).toContain(
      `<link rel="stylesheet" crossorigin href="/${css?.fileName}">`,
    )
    expect(html?.source).toContain('<h1>Hello world</h1>')
    expect(html?.source).not.toContain('src="entry.js"')
    expect(entry?.code).toContain('from-html-entry')
    expect(entry?.code).toContain('relList.supports("modulepreload")')
    expect(css?.source).toMatch(/color:\s*red/)
  })

  test('preloads the CSS and the imports of the lazy chunks', async () => {
    const { output } = (await build({
      root: resolve(dirname, 'packages/build-project'),
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
      },
      plugins: [
        {
          name: 'test',
          resolveId(id) {
            if (
              id === 'entry.js' ||
              id === 'lazy.js' ||
              id === 'other.js' ||
              id === 'shared.js' ||
              id === 'lazy.css'
            ) {
              return '\0' + id
            }
          },
          load(id) {
            if (id === '\0entry.js') {
              return `window.addEventListener('click', () => { import('lazy.js'); import('other.js') })`
            }
            if (id === '\0lazy.js') {
              return `import { shared } from 'shared.js'\nimport 'lazy.css'\nexport default shared + 'lazy'`
            }
            if (id === '\0other.js') {
              return `import { shared } from 'shared.js'\nexport default shared + 'other'`
            }
            if (id === '\0shared.js') {
              return `export const shared = 'shared'`
            }
            if (id === '\0lazy.css') {
              return `.lazy { color: red }`
            }
          },
        },
      ],
    })) as RolldownOutput

    const fileNameOf = (name: string) =>
      output.find((o) => o.type === 'chunk' && o.name === name)!.fileName
    const entry = output.find(
      (o): o is OutputChunk => o.type === 'chunk' && o.isEntry,
    )!
    const css = output.find(
      (o) => o.type === 'asset' && o.fileName.endsWith('.css'),
    )!
    const deps = JSON.parse(/m\.f=(\[[^\]]*\])/.exec(entry.code)![1]) as string[]
    const preloads = Array.from(
      entry.code.matchAll(
        /__vitePreload\(\(\) => import\("\.\/([^"]+)"\), __vite__mapDeps\(\[([\d,]+)\]\)\)/g,
      ),
      ([, file, indexes]) => [file, indexes.split(',').map((i) => deps[Number(i)])],
    )
    expect(Object.fromEntries(preloads)).toEqual({
      [basename(fileNameOf('_lazy'))]: [
        fileNameOf('_lazy'),
        fileNameOf('_shared'),
        css.fileName,
      ],
      [basename(fileNameOf('_other'))]: [
        fileNameOf('_other'),
        fileNameOf('_shared'),
      ],
    })
    // the preload helper comes with the function that it calls
    expect(entry.code).toMatch(/\bisCssPreloadUrl = function isCssPreloadUrl\(/)
  })

  test('does not inject the module preload polyfill when it is disabled', async () => {
    const { entry } = findOutputs(
      (await buildHtmlProject({ polyfill: false })).output,
    )

    expect(entry?.code).toContain('from-html-entry')
    expect(entry?.code).not.toContain('modulepreload')
  })
})

async function buildProjectWithRenderBuiltUrl(
  renderBuiltUrl: (filename: string) => string,
  includePostfixes = false,
) {
  return (await build({
    root: resolve(dirname, 'packages/build-project'),
    logLevel: 'silent',
    build: {
      write: false,
      assetsInlineLimit: 0,
    },
    experimental: {
      renderBuiltUrl,
    },
    plugins: [
      {
        name: 'test',
        resolveId(id) {
          if (id === 'entry.js' || id === 'subentry.js' || id === 'style.css') {
            return '\0' + id
          }
        },
        load(id) {
          if (id === '\0entry.js') {
            return `
              import assetUrl from '/asset.txt?url${includePostfixes ? '&marker=value' : ''}'
              ${includePostfixes ? `import otherAssetUrl from '/asset.txt?url&marker=other'` : ''}
              ${includePostfixes ? `import 'style.css'` : ''}
              console.log(assetUrl${includePostfixes ? `, otherAssetUrl` : ''})
              window.addEventListener('click', () => { import('subentry.js') })
            `
          }
          if (id === '\0subentry.js') {
            return `export default 'subentry'`
          }
          if (id === '\0style.css') {
            return `
              .asset-a { background: url('/asset.txt?marker=value') }
              .asset-b { background: url('/asset.txt?marker=other') }
            `
          }
        },
      },
    ],
  })) as RolldownOutput
}

/**
 * for each chunks in output1, if there's a chunk in output2 with the same fileName,
 * ensure that the chunk code is the same. if not, the chunk hash should have changed.
 */
function assertOutputHashContentChange(
  output1: RolldownOutput,
  output2: RolldownOutput,
) {
  for (const chunk of output1.output) {
    if (chunk.type === 'chunk') {
      const chunk2 = output2.output.find(
        (c) => c.type === 'chunk' && c.fileName === chunk.fileName,
      ) as OutputChunk | undefined
      if (chunk2) {
        expect(
          chunk.code,
          `the ${chunk.fileName} chunk has the same hash but different contents between builds`,
        ).toEqual(chunk2.code)
      }
    }
  }
}

function getOutputHashChanges(
  output1: RolldownOutput,
  output2: RolldownOutput,
) {
  const map1 = Object.fromEntries(
    output1.output.map((o) => [o.name, o.fileName]),
  )
  const map2 = Object.fromEntries(
    output2.output.map((o) => [o.name, o.fileName]),
  )
  const names = Object.keys(map1).filter(Boolean)
  return {
    changed: names.filter((name) => map1[name] !== map2[name]),
    unchanged: names.filter((name) => map1[name] === map2[name]),
  }
}
