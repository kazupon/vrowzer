import { init, parse } from 'es-module-lexer'
import MagicString from 'magic-string'
import type { PluginContext, TransformResult } from 'rolldown'
import { describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import type { Plugin } from '../plugin'
import type { DevEnvironment } from '../server/environment'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteTransformPlugin: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/parseAst', async () => import('rolldown/parseAst'))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

import {
  importAnalysisPlugin,
  interopNamedImports,
  transformCjsImport,
} from './importAnalysis'

const config = {
  command: 'serve',
  legacy: {},
  logger: {
    warn: vi.fn<() => void>(),
  },
} as unknown as ResolvedConfig

describe('CJS import interop', () => {
  it('separates the import from its hoisted assignment', () => {
    expect(
      transformCjsImport(
        'import ms from "ms"',
        '/deps/ms.js',
        'ms',
        0,
        '/entry.js',
        false,
        config,
      ),
    ).toStrictEqual({
      importLine: 'import __vite__cjsImport0_ms from "/deps/ms.js"',
      hoistedAssignments:
        'const ms = !__vite__cjsImport0_ms.__esModule ? __vite__cjsImport0_ms : __vite__cjsImport0_ms.default',
    })
  })

  it('hoists the assignment before a use preceding the import', async () => {
    const source = [
      'console.log(ms("2 days"))',
      'import ms from "ms"',
      '',
    ].join('\n')
    const transformed = await rewriteCjsImport(source)

    expect(transformed.indexOf('const ms =')).toBeLessThan(
      transformed.indexOf('console.log'),
    )
    expect(transformed).toContain(
      'import __vite__cjsImport0_ms from "/deps/ms.js"',
    )
  })

  it('keeps a hashbang before the hoisted assignment', async () => {
    const hashbang = '#!/usr/bin/env node\n'
    const source = [
      hashbang.trimEnd(),
      'console.log(ms("2 days"))',
      'import ms from "ms"',
      '',
    ].join('\n')
    const transformed = await rewriteCjsImport(source)

    expect(transformed.startsWith(`${hashbang}const ms =`)).toBe(true)
    expect(transformed.indexOf('const ms =')).toBeLessThan(
      transformed.indexOf('console.log'),
    )
  })

  it('uses bundler interop for a dynamic import from an ambiguous importer', async () => {
    const transformed = await rewriteCjsImport('import("ms")', false)

    expect(transformed).toContain("import('/deps/ms.js').then(m =>")
    expect(transformed).toContain('m.default, 0))')
  })

  it('uses Node interop for a dynamic import from an explicit importer', async () => {
    const transformed = await rewriteCjsImport('import("ms")', true)

    expect(transformed).toContain("import('/deps/ms.js').then(m =>")
    expect(transformed).toContain('m.default, 1))')
  })
})

describe('optimized dependency import interop', () => {
  it('rewrites a bare CJS import injected into an optimized dependency', async () => {
    const transformed = await transformOptimizedImport('injected-cjs')

    expect(transformed).toContain(
      'import __vite__cjsImport0_injectedCjs from "/@fs/cache/deps/injected-cjs.js"',
    )
    expect(transformed).toContain(
      'const msg = __vite__cjsImport0_injectedCjs["msg"]',
    )
  })

  it('preserves a relative import emitted by the optimizer', async () => {
    const transformed = await transformOptimizedImport('./injected-cjs.js')

    expect(transformed).toContain(
      'import { msg } from "/@fs/cache/deps/injected-cjs.js"',
    )
    expect(transformed).not.toContain('__vite__cjsImport')
  })
})

async function rewriteCjsImport(
  source: string,
  isNodeMode = false,
): Promise<string> {
  await init
  const [imports] = parse(source)
  const str = new MagicString(source)

  interopNamedImports(
    str,
    imports[0],
    '/deps/ms.js',
    0,
    '/entry.js',
    isNodeMode,
    config,
  )

  return str.toString()
}

async function transformOptimizedImport(specifier: string): Promise<string> {
  const importer = '/cache/deps/optimized-importer.js'
  const resolvedId = '/cache/deps/injected-cjs.js'
  const importerModule = {
    file: importer,
    url: '/@fs/cache/deps/optimized-importer.js',
    isSelfAccepting: false,
  }
  const moduleGraph = {
    getModuleById: () => importerModule,
    _ensureEntryFromUrl: async () => ({ lastHMRTimestamp: 0 }),
    updateModuleInfo: async () => undefined,
    _hasResolveFailedErrorModules: new Set(),
  }
  const environment = {
    config: {
      root: '/project',
      consumer: 'client',
      resolve: {
        builtins: [],
      },
      dev: {
        preTransformRequests: false,
      },
    },
    depsOptimizer: {
      options: {
        exclude: [],
      },
      scanProcessing: Promise.resolve(),
      metadata: {
        depInfoList: [
          {
            file: resolvedId,
            needsInterop: true,
          },
        ],
      },
      isOptimizedDepFile: (id: string) => id.startsWith('/cache/deps/'),
    },
    moduleGraph,
    warmupRequest() {},
  } as unknown as DevEnvironment
  const transformConfig = {
    root: '/project',
    base: '/',
    command: 'serve',
    build: {
      sourcemap: false,
    },
    experimental: {
      hmrPartialAccept: false,
    },
    resolve: {
      alias: [],
    },
    env: {},
    define: {},
    legacy: {
      inconsistentCjsInterop: true,
    },
    assetsInclude: () => false,
    safeModulePaths: new Set<string>(),
    logger: {
      error() {},
      warn() {},
    },
  } as unknown as ResolvedConfig
  const plugin = importAnalysisPlugin(transformConfig)
  const transform = getTransformHandler(plugin)
  const context = {
    environment,
    resolve: async () => ({ id: resolvedId }),
    error(error: unknown) {
      throw error
    },
    warn() {},
  } as unknown as PluginContext
  const result = await transform.call(
    context,
    `import { msg } from '${specifier}'`,
    importer,
  )

  if (!result || typeof result === 'string' || !('code' in result)) {
    throw new Error('Expected import analysis to return transformed code')
  }
  return result.code
}

type TransformHandler = (
  this: PluginContext,
  code: string,
  id: string,
) =>
  | TransformResult
  | string
  | null
  | undefined
  | Promise<TransformResult | string | null | undefined>

function getTransformHandler(plugin: Plugin): TransformHandler {
  const hook = plugin.transform
  if (!hook) {
    throw new Error(`Plugin "${plugin.name}" has no transform hook`)
  }
  return (
    typeof hook === 'function' ? hook : hook.handler
  ) as TransformHandler
}
