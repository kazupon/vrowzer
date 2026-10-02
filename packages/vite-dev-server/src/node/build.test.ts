import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import colors from 'picocolors'
import type {
  LogLevel,
  OutputChunk,
  OutputOptions,
  RolldownOptions,
  RolldownOutput,
  RollupLog,
} from 'rolldown'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vite-plus/test'

// NOTE(kazupon): vite-dev-server loads rolldown from the browser build (`@vrowzer/rolldown`).
// The unit tests run in Node, so they build with the Node build of the same rolldown version.
vi.mock('@vrowzer/rolldown', () => import('rolldown'))
vi.mock('@vrowzer/rolldown/experimental', () => import('rolldown/experimental'))
vi.mock('@vrowzer/rolldown/parseAst', () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => import('rolldown/utils'))

import type { LibraryFormats, LibraryOptions } from './build'
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

// Ported from upstream Vite (`packages/vite/src/node/__tests__/build.spec.ts`).
// NOTE(kazupon): not ported yet:
// - the builds of HTML, CSS and assets (they need `buildHtmlPlugin` and the other build plugins)
// - the SSR builds, `sharedConfigBuild`, `chunkImportMap`, the watch mode and the manifest
// - `config.tsconfig` (Vite 8.3), which the resolved config does not have yet

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

    // NOTE(kazupon): the resolved config does not have `tsconfig` (Vite 8.3) yet
    // test('top-level tsconfig applies to Rolldown options', async () => {
    //   const builder = await createBuilder({
    //     root: buildProjectRoot,
    //     logLevel: 'silent',
    //     tsconfig: './custom.tsconfig.json',
    //     build: {
    //       rolldownOptions: {
    //         tsconfig: './other.tsconfig.json',
    //         resolve: { tsconfigFilename: './legacy.tsconfig.json' },
    //       },
    //     },
    //   })
    //   const options = resolveRolldownOptions(
    //     builder.environments.client,
    //     new ChunkMetadataMap(),
    //   )
    //   expect(options.tsconfig).toBe(
    //     normalizePath(resolve(buildProjectRoot, 'custom.tsconfig.json')),
    //   )
    //   expect(options.resolve?.tsconfigFilename).toBeUndefined()
    // })

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
          // NOTE(kazupon): build the JS entry directly, because the HTML entry (`index.html`) needs
          // `buildHtmlPlugin`, which is not ported yet
          input: 'entry.js',
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
