import { init, parse } from 'es-module-lexer'
import MagicString from 'magic-string'
import { describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'

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

import { interopNamedImports, transformCjsImport } from './importAnalysis'

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
})

async function rewriteCjsImport(source: string): Promise<string> {
  await init
  const [imports] = parse(source)
  const str = new MagicString(source)

  interopNamedImports(
    str,
    imports[0],
    '/deps/ms.js',
    0,
    '/entry.js',
    false,
    config,
  )

  return str.toString()
}
