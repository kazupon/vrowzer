import type { RolldownOutput, RolldownWatcher } from 'rolldown'
import { describe, expect, test, vi } from 'vite-plus/test'
import type { ResolvedBuildOptions } from './build'
import {
  BuildProjectError,
  INVALID_OUTPUT_PATH,
  PUBLIC_FILE_COLLISION,
  UNSUPPORTED_OPTION,
  addPublicFiles,
  checkChunkSizes,
  collectOutputs,
  createBuildLogPlugin,
  createBuildOptionsPlugin,
  createCollectingLogger,
  createUnsupportedFeaturesPlugin,
  stripAnsi,
  toBuildProjectError,
  validateBuildOptions,
} from './builderUtils'
import type { ResolvedConfig, UserConfig } from './config'

const ESC = String.fromCharCode(27)

function red(text: string): string {
  return `${ESC}[31m${text}${ESC}[0m`
}

function buildOptions(options: Partial<ResolvedBuildOptions> = {}): ResolvedBuildOptions {
  return {
    lib: { entry: '/src/index.ts', formats: ['es'] },
    minify: 'oxc',
    watch: null,
    ssr: false,
    manifest: false,
    ssrManifest: false,
    license: false,
    rolldownOptions: {},
    ...options,
  } as ResolvedBuildOptions
}

function output(items: unknown[]): RolldownOutput {
  return { output: items } as unknown as RolldownOutput
}

function catchError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected an error')
}

describe('validateBuildOptions', () => {
  test('accepts a library build in the es format', () => {
    expect(validateBuildOptions(buildOptions())).toEqual([])
    expect(validateBuildOptions(buildOptions({ minify: false }))).toEqual([])
  })

  test('accepts an app build with one HTML entry', () => {
    expect(validateBuildOptions(buildOptions({ lib: false }))).toEqual([])
    expect(
      validateBuildOptions(
        buildOptions({ lib: false, rolldownOptions: { input: '/nested/index.html' } }),
      ),
    ).toEqual([])
    expect(validateBuildOptions(buildOptions({ lib: false }), '/app.htm')).toEqual([])
  })

  test.each([
    [['/a.html', '/b.html']],
    [{ a: '/a.html', b: '/b.html' }],
  ])('rejects multiple entries of an app (%o)', (input) => {
    expect(
      validateBuildOptions(buildOptions({ lib: false, rolldownOptions: { input } })),
    ).toEqual([
      expect.objectContaining({
        code: UNSUPPORTED_OPTION,
        message: expect.stringContaining(
          'build.rolldownOptions.input: only a single HTML entry is supported',
        ),
      }),
    ])
    expect(validateBuildOptions(buildOptions({ lib: false }), input)).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('input: only a single HTML entry is supported'),
      }),
    ])
  })

  test('rejects an app entry that is not HTML', () => {
    expect(
      validateBuildOptions(
        buildOptions({ lib: false, rolldownOptions: { input: '/src/main.ts' } }),
      ),
    ).toEqual([
      expect.objectContaining({
        code: UNSUPPORTED_OPTION,
        message: expect.stringContaining(
          'build.rolldownOptions.input: the entry of an app must be an HTML file, but got "/src/main.ts"',
        ),
      }),
    ])
    expect(
      validateBuildOptions(buildOptions({ lib: false }), '/src/main.ts')[0].message,
    ).toContain('[vrowzer] input: the entry of an app must be an HTML file')
  })

  test('takes build.rolldownOptions.input over the top-level input', () => {
    expect(
      validateBuildOptions(
        buildOptions({ lib: false, rolldownOptions: { input: '/index.html' } }),
        ['/a.html', '/b.html'],
      ),
    ).toEqual([])
  })

  test('rejects library formats other than es', () => {
    const problems = validateBuildOptions(
      buildOptions({ lib: { entry: '/src/index.ts', formats: ['es', 'umd', 'cjs'] } }),
    )

    expect(problems).toHaveLength(1)
    expect(problems[0].message).toContain('build.lib.formats')
    expect(problems[0].message).toContain('"umd", "cjs"')
  })

  test.each([
    [['/src/a.ts', '/src/b.ts']],
    [{ a: '/src/a.ts', b: '/src/b.ts' }],
  ])('rejects multiple library entries (%o)', (entry) => {
    expect(
      validateBuildOptions(buildOptions({ lib: { entry, formats: ['es'] } })),
    ).toEqual([
      expect.objectContaining({ message: expect.stringContaining('build.lib.entry') }),
    ])
  })

  test('leaves a missing library entry to Vite', () => {
    expect(
      validateBuildOptions(
        buildOptions({ lib: { formats: ['es'] } as ResolvedBuildOptions['lib'] }),
      ),
    ).toEqual([])
  })

  test.each(['terser', 'esbuild'] as const)('rejects the %s minifier', (minify) => {
    expect(validateBuildOptions(buildOptions({ minify }))).toEqual([
      expect.objectContaining({ message: expect.stringContaining('build.minify') }),
    ])
  })

  test('reports every unsupported option', () => {
    const problems = validateBuildOptions(
      buildOptions({
        watch: {},
        ssr: true,
        manifest: true,
        ssrManifest: true,
        license: true,
      }),
    )

    expect(problems.map(problem => problem.message.split(':')[0])).toEqual([
      '[vrowzer] build.watch',
      '[vrowzer] build.ssr',
      '[vrowzer] build.manifest',
      '[vrowzer] build.ssrManifest',
      '[vrowzer] build.license',
    ])
    expect(problems.every(problem => problem.code === UNSUPPORTED_OPTION)).toBe(true)
  })
})

describe('createBuildOptionsPlugin', () => {
  function callConfig(config: UserConfig): unknown {
    const plugin = createBuildOptionsPlugin({})
    return (plugin.config as (config: UserConfig) => unknown)(config)
  }

  test('runs after the plugins of the Worker config', () => {
    expect(createBuildOptionsPlugin({}).enforce).toBe('post')
  })

  test('defaults the library formats to es', () => {
    expect(callConfig({ build: { lib: { entry: '/src/index.ts' } } })).toEqual({
      build: { lib: { formats: ['es'] } },
    })
    expect(
      callConfig({ build: { lib: { entry: '/src/index.ts', formats: ['umd'] } } }),
    ).toBeUndefined()
    expect(callConfig({})).toBeUndefined()
  })

  test.each([true, 'lightningcss', 'esbuild'] as const)(
    'rejects build.cssMinify: %s',
    (cssMinify) => {
      const error = catchError(() => callConfig({ build: { cssMinify } }))

      expect(error).toBeInstanceOf(BuildProjectError)
      expect((error as BuildProjectError).errors).toEqual([
        expect.objectContaining({
          code: UNSUPPORTED_OPTION,
          message: expect.stringContaining('build.cssMinify'),
        }),
      ])
    },
  )

  test('keeps the resolved config and rejects unsupported options', () => {
    const state: { config?: ResolvedConfig } = {}
    const plugin = createBuildOptionsPlugin(state)
    const configResolved = plugin.configResolved as (config: ResolvedConfig) => void
    const supported = { build: buildOptions() } as ResolvedConfig
    const unsupported = {
      build: buildOptions({ lib: false }),
      input: ['/a.html', '/b.html'],
    } as ResolvedConfig

    configResolved(supported)
    expect(state.config).toBe(supported)

    const error = catchError(() => configResolved(unsupported))
    expect(error).toBeInstanceOf(BuildProjectError)
    expect((error as BuildProjectError).message).toContain(
      'input: only a single HTML entry is supported',
    )
  })
})

describe('createCollectingLogger', () => {
  test('collects the warnings and the errors without colors, and drops the other logs', () => {
    const warnings: { message: string }[] = []
    const logger = createCollectingLogger(warnings)
    const error = new Error('not found')

    logger.info('info')
    expect(logger.hasWarned).toBe(false)

    logger.warn(red('[plugin test] careful'))
    logger.warnOnce('once')
    logger.warnOnce('once')
    logger.error(red('[vite:css] @import not found'), { error })

    expect(warnings).toEqual([
      { message: '[plugin test] careful' },
      { message: 'once' },
      { message: '[vite:css] @import not found' },
    ])
    expect(logger.hasWarned).toBe(true)
    expect(logger.hasErrorLogged(error)).toBe(true)
  })
})

describe('createBuildLogPlugin', () => {
  type OnLog = (
    level: 'info' | 'warn' | 'debug',
    log: Record<string, unknown>,
    defaultHandler: (level: string, log: Record<string, unknown> | string) => void,
  ) => void

  function resolveOnLog(warnings: { message: string }[], config: UserConfig = {}): OnLog {
    const plugin = createBuildLogPlugin(warnings)
    const result = (plugin.config as (config: UserConfig) => UserConfig)(config)
    return result.build!.rolldownOptions!.onLog as unknown as OnLog
  }

  const log = {
    code: 'EVAL',
    message: red('Use of eval is strongly discouraged'),
    id: '/src/main.ts',
    loc: { line: 3, column: 2, file: '/src/main.ts' },
    frame: red('3 | eval("1")'),
  }

  // Vite's handler: logs a warning unless it ignores the code
  const viteHandler =
    (warnings: { message: string }[]) =>
    (level: string, handlerLog: Record<string, unknown> | string) => {
      if (level === 'warn' && typeof handlerLog === 'object' && handlerLog.code !== 'IGNORED') {
        warnings.push({ message: stripAnsi(String(handlerLog.message)) })
      }
    }

  test('keeps the details of the warnings that Vite logs', () => {
    const warnings: { message: string }[] = []
    resolveOnLog(warnings)('warn', log, viteHandler(warnings))

    expect(warnings).toEqual([
      {
        message: 'Use of eval is strongly discouraged',
        code: 'EVAL',
        id: '/src/main.ts',
        loc: { line: 3, column: 2, file: '/src/main.ts' },
        frame: '3 | eval("1")',
      },
    ])
  })

  test('leaves the logs that Vite ignores and the other levels', () => {
    const warnings: { message: string }[] = []
    const onLog = resolveOnLog(warnings)
    onLog('warn', { ...log, code: 'IGNORED' }, viteHandler(warnings))
    onLog('info', log, viteHandler(warnings))

    expect(warnings).toEqual([])
  })

  test('calls the onLog of the config first', () => {
    const warnings: { message: string }[] = []
    const seen: string[] = []
    const onLog = resolveOnLog(warnings, {
      build: {
        rolldownOptions: {
          onLog(level, configLog, handler) {
            seen.push(String(configLog.code))
            // drop the logs of a code, and pass the others on
            if (configLog.code !== 'DROPPED') {
              handler(level, configLog)
            }
          },
        },
      },
    })
    onLog('warn', { ...log, code: 'DROPPED' }, viteHandler(warnings))
    onLog('warn', log, viteHandler(warnings))

    expect(seen).toEqual(['DROPPED', 'EVAL'])
    expect(warnings).toEqual([expect.objectContaining({ code: 'EVAL', id: '/src/main.ts' })])
  })
})

describe('checkChunkSizes', () => {
  const chunk = (size: number) => ({ type: 'chunk', fileName: 'index.js', code: 'x'.repeat(size) })
  const options = (overrides: Partial<ResolvedBuildOptions> = {}) =>
    ({
      minify: 'oxc',
      lib: false,
      chunkSizeWarningLimit: 1,
      ...overrides,
    }) as ResolvedBuildOptions

  test('warns about the chunks larger than the limit, as the reporter of Vite does', () => {
    expect(checkChunkSizes(output([chunk(1001)]), options())).toEqual({
      message: expect.stringContaining(
        '(!) Some chunks are larger than 1 kB after minification. Consider:',
      ),
    })
    expect(checkChunkSizes(output([chunk(1000)]), options())).toBeUndefined()
  })

  test('does not check libraries and builds without minification', () => {
    expect(checkChunkSizes(output([chunk(2000)]), options({ minify: false }))).toBeUndefined()
    expect(
      checkChunkSizes(
        output([chunk(2000)]),
        options({ lib: { entry: '/src/index.ts' } as ResolvedBuildOptions['lib'] }),
      ),
    ).toBeUndefined()
  })
})

describe('collectOutputs', () => {
  test('returns code, text assets and binary assets', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const files = collectOutputs(
      output([
        { type: 'chunk', fileName: 'my-lib.js', code: 'export {}' },
        { type: 'asset', fileName: 'my-lib.css', source: '.a{}' },
        { type: 'asset', fileName: 'assets/a.bin', source: bytes },
      ]),
    )

    expect(files['my-lib.js']).toBe('export {}')
    expect(files['my-lib.css']).toBe('.a{}')
    expect(files['assets/a.bin']).toBeInstanceOf(ArrayBuffer)
    expect([...new Uint8Array(files['assets/a.bin'] as ArrayBuffer)]).toEqual([1, 2, 3])
  })

  test('copies the bytes of a view into a larger or shared buffer', () => {
    const view = new Uint8Array(new ArrayBuffer(8), 2, 3)
    view.set([4, 5, 6])
    const shared = new Uint8Array(new SharedArrayBuffer(2))
    shared.set([7, 8])
    const files = collectOutputs(
      output([
        { type: 'asset', fileName: 'view.bin', source: view },
        { type: 'asset', fileName: 'shared.bin', source: shared },
      ]),
    )

    expect(files['view.bin']).toBeInstanceOf(ArrayBuffer)
    expect([...new Uint8Array(files['view.bin'] as ArrayBuffer)]).toEqual([4, 5, 6])
    expect(files['shared.bin']).toBeInstanceOf(ArrayBuffer)
    expect([...new Uint8Array(files['shared.bin'] as ArrayBuffer)]).toEqual([7, 8])
  })

  test.each(['../outside.js', 'nested/../../outside.js', '/absolute.js'])(
    'rejects the output %s outside the output directory',
    (fileName) => {
      const error = catchError(() =>
        collectOutputs(output([{ type: 'chunk', fileName, code: '' }])),
      )

      expect(error).toBeInstanceOf(BuildProjectError)
      expect((error as BuildProjectError).errors[0].code).toBe(INVALID_OUTPUT_PATH)
    },
  )

  test('rejects a watcher', () => {
    expect(() => collectOutputs({} as RolldownWatcher)).toThrow(BuildProjectError)
  })
})

describe('addPublicFiles', () => {
  const config = { publicDir: '/public', build: { copyPublicDir: true } }

  test('adds the public files at the output root', () => {
    const binary = new Uint8Array([1, 2]).buffer
    const files: Record<string, string | ArrayBuffer> = { 'my-lib.js': '' }
    addPublicFiles(
      files,
      {
        '/src/index.ts': '',
        '/public/robots.txt': 'robots',
        '/public/images/logo.png': binary,
        '/publicity.txt': 'not public',
      },
      config,
    )

    expect(Object.keys(files).sort()).toEqual(['images/logo.png', 'my-lib.js', 'robots.txt'])
    expect(files['robots.txt']).toBe('robots')
    expect(files['images/logo.png']).not.toBe(binary)
    expect([...new Uint8Array(files['images/logo.png'] as ArrayBuffer)]).toEqual([1, 2])
  })

  test('does nothing without the public directory', () => {
    const files = {}
    addPublicFiles(files, { '/public/a.txt': 'a' }, { publicDir: '', build: { copyPublicDir: true } })
    addPublicFiles(files, { '/public/a.txt': 'a' }, { ...config, build: { copyPublicDir: false } })

    expect(files).toEqual({})
  })

  test('rejects a public file that has the path of an output', () => {
    const error = catchError(() =>
      addPublicFiles({ 'my-lib.js': '' }, { '/public/my-lib.js': '' }, config),
    )

    expect(error).toBeInstanceOf(BuildProjectError)
    expect((error as BuildProjectError).errors[0].code).toBe(PUBLIC_FILE_COLLISION)
  })
})

describe('toBuildProjectError', () => {
  test('converts the errors of a rolldown build', () => {
    const error = Object.assign(new Error('Build failed with 2 errors'), {
      errors: [
        {
          code: 'PARSE_ERROR',
          message: `${red('[PARSE_ERROR]')} Unexpected token`,
          id: '/src/index.ts',
          loc: { line: 1, column: 17, file: '/src/index.ts' },
          pos: 17,
        },
        {
          code: 'PLUGIN_ERROR',
          message: 'boom',
          plugin: 'my-plugin',
          id: '/src/a.ts',
          loc: { line: 2, column: 0 },
          frame: red('1: const a = 1'),
          hook: 'transform',
        },
      ],
    })

    const converted = toBuildProjectError(error)

    expect(converted).toBeInstanceOf(BuildProjectError)
    expect(converted.message).toBe('[PARSE_ERROR] Unexpected token')
    expect(converted.errors).toEqual([
      {
        code: 'PARSE_ERROR',
        message: '[PARSE_ERROR] Unexpected token',
        id: '/src/index.ts',
        loc: { line: 1, column: 17, file: '/src/index.ts' },
      },
      {
        code: 'PLUGIN_ERROR',
        message: 'boom',
        plugin: 'my-plugin',
        id: '/src/a.ts',
        loc: { line: 2, column: 0 },
        frame: '1: const a = 1',
      },
    ])
  })

  test('reads the plugin and the module of a native plugin from the message', () => {
    const message = [
      `${red('[builtin:vite-transform]')} Unexpected token`,
      '   ╭─[ src/math.ts:1:23 ]',
      ' 1 │ export const broken = ;',
    ].join('\n')
    const error = Object.assign(new Error('Build failed with 1 error'), {
      errors: [{ code: 'PLUGIN_ERROR', message, id: undefined, loc: { line: 1, column: 22 } }],
    })

    expect(toBuildProjectError(error).errors[0]).toEqual({
      code: 'PLUGIN_ERROR',
      message: stripAnsi(message),
      plugin: 'builtin:vite-transform',
      id: '/src/math.ts',
      loc: { line: 1, column: 22 },
    })
  })

  test('keeps the plugin and the module that rolldown reports', () => {
    const error = Object.assign(new Error('Build failed with 1 error'), {
      errors: [
        {
          code: 'PLUGIN_ERROR',
          message: '[other] boom\n ╭─[ src/other.ts:1:1 ]',
          plugin: 'my-plugin',
          id: '/src/a.ts',
        },
      ],
    })

    expect(toBuildProjectError(error).errors[0]).toMatchObject({
      plugin: 'my-plugin',
      id: '/src/a.ts',
    })
  })

  test('converts other failures into one log', () => {
    expect(toBuildProjectError(new Error(red('failed'))).errors).toEqual([{ message: 'failed' }])
    expect(toBuildProjectError('failed').errors).toEqual([{ message: 'failed' }])
  })

  test('keeps a BuildProjectError', () => {
    const error = new BuildProjectError([{ message: 'unsupported' }])

    expect(toBuildProjectError(error)).toBe(error)
  })
})

describe('stripAnsi', () => {
  test('removes the color codes', () => {
    expect(stripAnsi(`${red('a')} b ${ESC}[38;5;246mc${ESC}[0m`)).toBe('a b c')
  })
})

describe('createUnsupportedFeaturesPlugin', () => {
  async function transform(code: string, id = '/src/main.js') {
    const warn = vi.fn<(message: string, pos: number) => void>()
    const plugin = createUnsupportedFeaturesPlugin()
    const hook = plugin.transform as (this: unknown, code: string, id: string) => Promise<void>
    await hook.call({ warn }, code, id)
    return warn.mock.calls.map(([message, pos]) => ({ message, pos }))
  }

  test('warns about import.meta.glob() and the Workers of the project, where they are', async () => {
    const code = [
      `const modules = import.meta.glob('./*.js')`,
      `const worker = new Worker(new URL('./worker.js', import.meta.url))`,
    ].join('\n')

    expect(await transform(code)).toEqual([
      { message: expect.stringContaining('import.meta.glob()'), pos: code.indexOf('import.meta.glob') },
      { message: expect.stringContaining('new Worker'), pos: code.indexOf('new Worker') },
    ])
  })

  test('warns about the dynamic imports with variables in their relative paths', async () => {
    const code = [
      'const lang = navigator.language',
      'import(`./locales/${lang}.js`)',
      `import('./pages/' + lang)`,
    ].join('\n')

    expect((await transform(code)).map(({ pos }) => pos)).toEqual([
      code.indexOf('import(`'),
      code.indexOf(`import('./pages/'`),
    ])
  })

  test('does not warn about the code that builds support', async () => {
    const code = [
      `const text = 'import.meta.glob( and new Worker(new URL( in a string'`,
      `// import.meta.glob('./*.js')`,
      `import('./static.js')`,
      'import(remoteUrl)',
      'import(/* @vite-ignore */ `./locales/${lang}.js`)',
      'import(`./plain.js`)',
    ].join('\n')

    expect(await transform(code)).toEqual([])
  })

  test('does not check virtual modules and dependencies', async () => {
    const code = `import.meta.glob('./*.js')`

    expect(await transform(code, '\0virtual:module')).toEqual([])
    expect(await transform(code, '/node_modules/dep/index.js')).toEqual([])
  })

  test('rejects the ?worker imports', () => {
    const error = vi.fn<(message: string) => never>((message) => {
      throw new Error(message)
    })
    const plugin = createUnsupportedFeaturesPlugin()
    const hook = (plugin.resolveId as { handler: (this: unknown, source: string) => void }).handler

    expect(() => hook.call({ error }, './worker.js?worker')).toThrow(
      'The Workers of the project ("./worker.js?worker") are not supported in builds yet.',
    )
    expect(() => hook.call({ error }, './worker.js?sharedworker&inline')).toThrow(
      'are not supported in builds yet',
    )
    expect(() => hook.call({ error }, './worker.js?url')).not.toThrow()
  })
})
